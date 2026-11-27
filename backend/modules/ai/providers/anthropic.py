"""Anthropic provider adapter."""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from http import HTTPStatus
from typing import Any, cast

from backend.core.config import settings
from backend.modules.ai.contracts import (
    AiAudioPart,
    AiCapability,
    AiImagePart,
    AiMessageRole,
    AiProviderRequest,
    AiProviderResponse,
    AiRunStartedEvent,
    AiStreamEvent,
    AiTextDeltaEvent,
    AiTextPart,
    AiToolCall,
    AiUsage,
)
from backend.modules.ai.errors import AiErrorKind, AiProviderError, classify_http_status
from backend.modules.ai.providers.common import (
    HttpAiProvider,
    _enforce_tool_call_limit,
    _parse_json_output,
)
from backend.modules.ai.providers.local import LocalHeuristicProvider


def _anthropic_content(content: Any) -> Any:
    if not isinstance(content, list):
        return content
    parts: list[dict[str, Any]] = []
    for part in cast(list[AiTextPart | AiImagePart | AiAudioPart], content):
        if isinstance(part, AiTextPart):
            parts.append({"type": "text", "text": part.text})
        elif isinstance(part, AiImagePart) and part.data_base64:
            parts.append(
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": part.media_type,
                        "data": part.data_base64,
                    },
                }
            )
        elif isinstance(part, AiImagePart) and part.url:
            parts.append({"type": "text", "text": f"Image URL: {part.url}"})
        else:
            raise AiProviderError(
                "Anthropic adapter does not support this media part",
                kind=AiErrorKind.INVALID_REQUEST,
                provider_key="anthropic",
            )
    return parts


class AnthropicProvider(HttpAiProvider):
    key = "anthropic"
    capabilities = frozenset(
        {
            AiCapability.TEXT,
            AiCapability.STRUCTURED_OUTPUT,
            AiCapability.STREAMING,
            AiCapability.TOOL_CALLING,
            AiCapability.MULTIMODAL,
            AiCapability.REASONING,
        }
    )

    def __init__(self) -> None:
        super().__init__(
            base_url=settings.ANTHROPIC_BASE_URL, api_key=settings.ANTHROPIC_API_KEY, key=self.key
        )

    def _headers(self) -> dict[str, str]:
        return {"x-api-key": self.api_key, "anthropic-version": "2023-06-01"}

    async def generate_contract(self, request: AiProviderRequest) -> AiProviderResponse:
        messages = [message for message in request.messages if message.role != AiMessageRole.SYSTEM]
        payload: dict[str, Any] = {
            "model": request.model,
            "system": request.system_prompt,
            "temperature": request.temperature,
            "max_tokens": request.max_output_tokens or settings.AI_MAX_OUTPUT_TOKENS,
            "messages": [
                {
                    "role": message.role.value,
                    "content": _anthropic_content(message.content),
                }
                for message in messages
            ],
        }
        if request.tools:
            payload["tools"] = [tool.model_dump() for tool in request.tools]
        data = await self._post_json("/messages", request, payload)
        output_text = "\n".join(
            block.get("text", "")
            for block in data.get("content", [])
            if block.get("type") == "text"
        )
        usage = data.get("usage", {})
        return AiProviderResponse(
            provider_key=self.key,
            model=request.model,
            output_text=output_text,
            output_json=_parse_json_output(output_text, request.response_format),
            tool_calls=_enforce_tool_call_limit(
                [
                    AiToolCall(
                        id=block.get("id", ""),
                        name=block.get("name", ""),
                        arguments=block.get("input", {}),
                    )
                    for block in data.get("content", [])
                    if block.get("type") == "tool_use"
                ],
                provider_key=self.key,
            ),
            usage=AiUsage(
                input_tokens=int(usage.get("input_tokens", 0)),
                output_tokens=int(usage.get("output_tokens", 0)),
            ),
            provider_request_id=data.get("id"),
            finish_reason=data.get("stop_reason"),
        )

    async def embed_texts(self, texts: list[str], model: str | None = None) -> list[list[float]]:
        if settings.AI_EMBEDDING_PROVIDER == "local":
            return await LocalHeuristicProvider().embed_texts(texts)
        raise AiProviderError(
            "Anthropic embeddings are not configured",
            kind=AiErrorKind.CONFIGURATION,
            provider_key=self.key,
        )

    async def stream_contract(self, request: AiProviderRequest) -> AsyncIterator[AiStreamEvent]:
        if not self.api_key:
            raise AiProviderError(
                "anthropic API key is not configured",
                kind=AiErrorKind.CONFIGURATION,
                provider_key=self.key,
            )
        run_id = request.metadata.get("run_id", request.provider_request_id)
        yield AiRunStartedEvent(
            run_id=run_id, sequence=0, provider_key=self.key, model=request.model
        )
        payload = {
            "model": request.model,
            "system": request.system_prompt,
            "max_tokens": request.max_output_tokens or settings.AI_MAX_OUTPUT_TOKENS,
            "messages": [{"role": "user", "content": request.user_prompt}],
            "stream": True,
        }
        sequence = 1
        async with self._client().stream(
            "POST", "/messages", headers=self._headers(), json=payload
        ) as response:
            if response.status_code >= HTTPStatus.BAD_REQUEST:
                kind, retryable = classify_http_status(response.status_code)
                raise AiProviderError(
                    "anthropic streaming request failed",
                    kind=kind,
                    provider_key=self.key,
                    status_code=response.status_code,
                    retryable=retryable,
                )
            async for line in response.aiter_lines():
                if not line.startswith("data:"):
                    continue
                try:
                    data = json.loads(line[5:].strip())
                except json.JSONDecodeError:
                    continue
                delta = data.get("delta", {}).get("text")
                if delta:
                    yield AiTextDeltaEvent(run_id=run_id, sequence=sequence, delta=delta)
                    sequence += 1
