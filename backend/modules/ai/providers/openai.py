"""OpenAI compatible provider adapters."""

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
    AiProviderRequest,
    AiProviderResponse,
    AiRunCompletedEvent,
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

_RAG_STRUCTURED_CONTRACT_MARKER = "NON-OVERRIDABLE OUTPUT CONTRACT"
_RAG_STRUCTURED_RESPONSE_SCHEMA = {
    "name": "rag_structured_answer",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "claims": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "text": {"type": "string", "minLength": 1},
                        "chunk_ids": {"type": "array", "items": {"type": "string"}, "minItems": 1},
                    },
                    "required": ["text", "chunk_ids"],
                },
            },
            "no_evidence": {"type": "boolean"},
            "insufficient_evidence_reason": {"type": ["string", "null"]},
        },
        "required": ["claims", "no_evidence", "insufficient_evidence_reason"],
    },
}


def _openai_response_format(request: AiProviderRequest) -> dict[str, object]:
    if request.response_format != "json":
        return {"type": "text"}
    if _RAG_STRUCTURED_CONTRACT_MARKER in request.system_prompt:
        return {"type": "json_schema", "json_schema": _RAG_STRUCTURED_RESPONSE_SCHEMA}
    return {"type": "json_object"}


def _openai_messages(request: AiProviderRequest) -> list[dict[str, Any]]:
    messages: list[dict[str, Any]] = []
    for message in request.messages:
        content: Any = message.content
        if isinstance(content, list):
            content = []
            for part in cast(list[AiTextPart | AiImagePart | AiAudioPart], message.content):
                if isinstance(part, AiTextPart):
                    content.append({"type": "text", "text": part.text})
                elif isinstance(part, AiImagePart):
                    image_url = part.url or f"data:{part.media_type};base64,{part.data_base64}"
                    content.append({"type": "image_url", "image_url": {"url": image_url}})
                elif isinstance(part, AiAudioPart):
                    content.append(
                        {
                            "type": "input_audio",
                            "input_audio": {
                                "data": part.data_base64,
                                "format": part.media_type.split("/", 1)[-1],
                            },
                        }
                    )
        item: dict[str, Any] = {"role": message.role.value, "content": content}
        if message.name:
            item["name"] = message.name
        if message.tool_call_id:
            item["tool_call_id"] = message.tool_call_id
        messages.append(item)
    return messages


def _raise_for_stream_error(response: Any, provider_key: str) -> None:
    if response.status_code >= HTTPStatus.BAD_REQUEST:
        kind, retryable = classify_http_status(response.status_code)
        raise AiProviderError(
            "openai streaming request failed",
            kind=kind,
            provider_key=provider_key,
            status_code=response.status_code,
            retryable=retryable,
        )


def _openai_responses_content(content: Any) -> Any:
    if not isinstance(content, list):
        return content
    parts: list[dict[str, Any]] = []
    for part in cast(list[AiTextPart | AiImagePart | AiAudioPart], content):
        if isinstance(part, AiTextPart):
            parts.append({"type": "input_text", "text": part.text})
        elif isinstance(part, AiImagePart):
            parts.append(
                {
                    "type": "input_image",
                    "image_url": part.url or f"data:{part.media_type};base64,{part.data_base64}",
                }
            )
        elif isinstance(part, AiAudioPart):
            parts.append(
                {
                    "type": "input_audio",
                    "data": part.data_base64,
                    "format": part.media_type.split("/", 1)[-1],
                }
            )
    return parts


class OpenAIProvider(HttpAiProvider):
    key = "openai"
    capabilities = frozenset(
        {
            AiCapability.TEXT,
            AiCapability.STRUCTURED_OUTPUT,
            AiCapability.STREAMING,
            AiCapability.TOOL_CALLING,
            AiCapability.EMBEDDINGS,
            AiCapability.MULTIMODAL,
            AiCapability.REASONING,
        }
    )

    def __init__(self) -> None:
        super().__init__(
            base_url=settings.OPENAI_BASE_URL, api_key=settings.OPENAI_API_KEY, key=self.key
        )

    async def generate_contract(self, request: AiProviderRequest) -> AiProviderResponse:
        if settings.AI_OPENAI_API_MODE == "chat_completions":
            payload: dict[str, Any] = {
                "model": request.model,
                "temperature": request.temperature,
                "response_format": _openai_response_format(request),
                "messages": _openai_messages(request),
            }
            if request.max_output_tokens:
                payload["max_tokens"] = request.max_output_tokens
            if request.tools:
                payload["tools"] = [
                    {"type": "function", "function": tool.model_dump()} for tool in request.tools
                ]
            data = await self._post_json("/chat/completions", request, payload)
            message = data.get("choices", [{}])[0].get("message", {})
            output_text = message.get("content") or ""
            tool_calls = _enforce_tool_call_limit(
                [
                    AiToolCall(
                        id=item.get("id", ""),
                        name=item.get("function", {}).get("name", ""),
                        arguments=json.loads(item.get("function", {}).get("arguments", "{}")),
                    )
                    for item in message.get("tool_calls", [])
                ],
                provider_key=self.key,
            )
            usage = data.get("usage", {})
            return AiProviderResponse(
                provider_key=self.key,
                model=request.model,
                output_text=output_text,
                output_json=_parse_json_output(output_text, request.response_format),
                tool_calls=tool_calls,
                usage=AiUsage(
                    input_tokens=int(usage.get("prompt_tokens", 0)),
                    output_tokens=int(usage.get("completion_tokens", 0)),
                ),
                provider_request_id=data.get("id"),
                finish_reason=data.get("choices", [{}])[0].get("finish_reason"),
            )

        input_items = [
            {
                "role": message.role.value,
                "content": _openai_responses_content(message.content),
            }
            for message in request.messages
        ]
        payload = {
            "model": request.model,
            "instructions": request.system_prompt,
            "input": input_items,
            "temperature": request.temperature,
        }
        if request.max_output_tokens:
            payload["max_output_tokens"] = request.max_output_tokens
        if request.response_format == "json":
            payload["text"] = {"format": _openai_response_format(request)}
        if request.tools:
            payload["tools"] = [{"type": "function", **tool.model_dump()} for tool in request.tools]
        data = await self._post_json("/responses", request, payload)
        output_text = str(data.get("output_text") or "")
        if not output_text:
            output_text = "".join(
                str(content.get("text", ""))
                for item in data.get("output", [])
                for content in item.get("content", [])
                if content.get("type") in {"output_text", "text"}
            )
        tool_calls = _enforce_tool_call_limit(
            [
                AiToolCall(
                    id=item.get("call_id") or item.get("id", ""),
                    name=item.get("name", ""),
                    arguments=json.loads(item.get("arguments", "{}")),
                )
                for item in data.get("output", [])
                if item.get("type") == "function_call"
            ],
            provider_key=self.key,
        )
        usage = data.get("usage", {})
        return AiProviderResponse(
            provider_key=self.key,
            model=request.model,
            output_text=output_text,
            output_json=_parse_json_output(output_text, request.response_format),
            tool_calls=tool_calls,
            usage=AiUsage(
                input_tokens=int(usage.get("input_tokens", 0)),
                output_tokens=int(usage.get("output_tokens", 0)),
                cached_input_tokens=int(
                    usage.get("input_tokens_details", {}).get("cached_tokens", 0)
                ),
            ),
            provider_request_id=data.get("id"),
        )

    async def embed_texts(self, texts: list[str], model: str | None = None) -> list[list[float]]:
        request = AiProviderRequest(model=model or settings.OPENAI_EMBEDDING_MODEL, messages=[])
        data = await self._post_json(
            "/embeddings", request, {"model": request.model, "input": texts}
        )
        return [item["embedding"] for item in data.get("data", [])]

    async def stream_contract(self, request: AiProviderRequest) -> AsyncIterator[AiStreamEvent]:
        if not self.api_key:
            raise AiProviderError(
                "openai API key is not configured",
                kind=AiErrorKind.CONFIGURATION,
                provider_key=self.key,
            )
        run_id = request.metadata.get("run_id", request.provider_request_id)
        yield AiRunStartedEvent(
            run_id=run_id, sequence=0, provider_key=self.key, model=request.model
        )
        path = (
            "/chat/completions"
            if settings.AI_OPENAI_API_MODE == "chat_completions"
            else "/responses"
        )
        if path.endswith("responses"):
            payload: dict[str, Any] = {
                "model": request.model,
                "instructions": request.system_prompt,
                "input": [
                    {"role": m.role.value, "content": _openai_responses_content(m.content)}
                    for m in request.messages
                ],
                "temperature": request.temperature,
                "max_output_tokens": request.max_output_tokens or settings.AI_MAX_OUTPUT_TOKENS,
                "stream": True,
            }
        else:
            payload = {
                "model": request.model,
                "messages": _openai_messages(request),
                "temperature": request.temperature,
                "max_completion_tokens": request.max_output_tokens or settings.AI_MAX_OUTPUT_TOKENS,
                "stream": True,
            }
        sequence = 1
        async with self._client().stream(
            "POST", path, headers=self._headers(), json=payload
        ) as response:
            _raise_for_stream_error(response, self.key)
            async for line in response.aiter_lines():
                if not line.startswith("data:"):
                    continue
                raw = line[5:].strip()
                if raw == "[DONE]":
                    break
                try:
                    data = json.loads(raw)
                except json.JSONDecodeError:
                    continue
                delta = data.get("delta")
                if delta is None:
                    delta = data.get("choices", [{}])[0].get("delta", {}).get("content")
                if delta:
                    yield AiTextDeltaEvent(run_id=run_id, sequence=sequence, delta=str(delta))
                    sequence += 1
                if data.get("type") in {"response.completed", "response.done"}:
                    response_payload = data.get("response", data)
                    usage = response_payload.get("usage", {})
                    yield AiRunCompletedEvent(
                        run_id=run_id,
                        sequence=sequence,
                        response=AiProviderResponse(
                            provider_key=self.key,
                            model=request.model,
                            usage=AiUsage(
                                input_tokens=int(usage.get("input_tokens", 0)),
                                output_tokens=int(usage.get("output_tokens", 0)),
                            ),
                            provider_request_id=response_payload.get("id"),
                        ),
                    )
                    sequence += 1


class OpenAICompatibleProvider(OpenAIProvider):
    key = "openai_compatible"

    def __init__(self) -> None:
        HttpAiProvider.__init__(
            self,
            base_url=settings.AI_COMPATIBLE_BASE_URL,
            api_key=settings.AI_COMPATIBLE_API_KEY,
            key=self.key,
        )
