"""Provider adapters with an application-owned compatibility surface.

The legacy generate/embed methods remain available for RAG and AI Studio. New
code should use the contract methods, which expose provider request IDs,
structured output, tools, multimodal parts, usage, streaming and cancellation
without importing an SDK type.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import math
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any, cast

import httpx

from backend.core.config import settings
from backend.lib.vectors import estimate_tokens
from backend.modules.ai.contracts import (
    AiAudioPart,
    AiCapability,
    AiImagePart,
    AiMessage,
    AiMessageRole,
    AiProviderRequest,
    AiProviderResponse,
    AiRunCompletedEvent,
    AiRunStartedEvent,
    AiStreamEvent,
    AiTextDeltaEvent,
    AiTextPart,
    AiToolCall,
    AiToolDefinition,
    AiUsage,
)
from backend.modules.ai.errors import AiErrorKind, AiProviderError, classify_http_status
from backend.modules.ai.reliability import execute_provider_call

_http_clients: dict[tuple[asyncio.AbstractEventLoop, str], httpx.AsyncClient] = {}
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
                        "chunk_ids": {
                            "type": "array",
                            "items": {"type": "string"},
                            "minItems": 1,
                        },
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


def _provider_http_client(base_url: str) -> httpx.AsyncClient:
    key = (asyncio.get_running_loop(), base_url)
    client = _http_clients.get(key)
    if client is None or client.is_closed:
        client = httpx.AsyncClient(
            timeout=httpx.Timeout(settings.AI_REQUEST_TIMEOUT_SECONDS),
            base_url=base_url,
        )
        _http_clients[key] = client
    return client


async def close_ai_provider_http_clients() -> None:
    loop = asyncio.get_running_loop()
    keys = [key for key in _http_clients.copy() if key[0] is loop]
    for key in keys:
        await _http_clients.pop(key).aclose()


@dataclass(slots=True)
class ProviderGenerateRequest:
    """Compatibility request retained for the existing AI/RAG services."""

    model: str
    system_prompt: str
    user_prompt: str
    response_format: str
    temperature: float
    tools: list[dict[str, Any]] | None = None
    max_output_tokens: int | None = None
    metadata: dict[str, str] | None = None
    timeout_seconds: float | None = None
    cancellation_event: asyncio.Event | None = None

    def to_contract(self) -> AiProviderRequest:
        return AiProviderRequest(
            model=self.model,
            messages=[
                AiMessage(role=AiMessageRole.SYSTEM, content=self.system_prompt),
                AiMessage(role=AiMessageRole.USER, content=self.user_prompt),
            ],
            response_format=self.response_format,
            tools=[AiToolDefinition(**tool) for tool in self.tools or []],
            temperature=self.temperature,
            max_output_tokens=self.max_output_tokens,
            metadata=self.metadata or {},
            timeout_seconds=self.timeout_seconds,
            cancellation_event=self.cancellation_event,
        )


@dataclass(slots=True)
class ProviderGenerateResult:
    provider_key: str
    model: str
    output_text: str
    output_json: dict | None
    input_tokens: int
    output_tokens: int
    provider_request_id: str | None = None
    tool_calls: list[dict[str, Any]] | None = None

    @property
    def total_tokens(self) -> int:
        return self.input_tokens + self.output_tokens

    @classmethod
    def from_response(cls, response: AiProviderResponse) -> ProviderGenerateResult:
        return cls(
            provider_key=response.provider_key,
            model=response.model,
            output_text=response.output_text,
            output_json=response.output_json,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
            provider_request_id=response.provider_request_id,
            tool_calls=[call.model_dump() for call in response.tool_calls],
        )


class BaseAiProvider:
    key = "base"
    capabilities: frozenset[AiCapability] = frozenset({AiCapability.TEXT})

    async def generate(self, request: ProviderGenerateRequest) -> ProviderGenerateResult:
        return ProviderGenerateResult.from_response(
            await self.generate_contract(request.to_contract())
        )

    async def generate_contract(self, request: AiProviderRequest) -> AiProviderResponse:
        raise NotImplementedError

    async def stream_contract(self, request: AiProviderRequest) -> AsyncIterator[AiStreamEvent]:
        raise AiProviderError(
            "Streaming is not supported by this provider",
            kind=AiErrorKind.INVALID_REQUEST,
            provider_key=self.key,
        )
        yield  # pragma: no cover

    async def embed_texts(self, texts: list[str], model: str | None = None) -> list[list[float]]:
        raise NotImplementedError

    def stream(
        self, request: ProviderGenerateRequest | AiProviderRequest
    ) -> AsyncIterator[AiStreamEvent]:
        contract = (
            request.to_contract() if isinstance(request, ProviderGenerateRequest) else request
        )
        return self.stream_contract(contract)


def _openai_response_format(
    request: ProviderGenerateRequest | AiProviderRequest,
) -> dict[str, object]:
    if request.response_format != "json":
        return {"type": "text"}
    if _RAG_STRUCTURED_CONTRACT_MARKER in request.system_prompt:
        return {"type": "json_schema", "json_schema": _RAG_STRUCTURED_RESPONSE_SCHEMA}
    return {"type": "json_object"}


def _hash_embedding(text: str, dimensions: int = 32) -> list[float]:
    values: list[float] = []
    for index in range(dimensions):
        digest = hashlib.sha256(f"{index}:{text}".encode()).digest()
        integer = int.from_bytes(digest[:8], "big")
        values.append(((integer % 2000) / 1000.0) - 1.0)
    norm = math.sqrt(sum(value * value for value in values)) or 1.0
    return [value / norm for value in values]


def _parse_json_output(text: str, response_format: str) -> dict[str, Any] | None:
    if response_format != "json":
        return None
    try:
        value = json.loads(text)
    except json.JSONDecodeError as exc:
        raise AiProviderError(
            "Provider returned invalid structured output",
            kind=AiErrorKind.STRUCTURED_OUTPUT,
            retryable=False,
        ) from exc
    if not isinstance(value, dict):
        raise AiProviderError(
            "Provider returned a non-object structured output",
            kind=AiErrorKind.STRUCTURED_OUTPUT,
            retryable=False,
        )
    return value


def _enforce_tool_call_limit(
    tool_calls: list[AiToolCall], *, provider_key: str
) -> list[AiToolCall]:
    if len(tool_calls) > settings.AI_MAX_TOOL_CALLS:
        raise AiProviderError(
            "Provider returned too many tool calls",
            kind=AiErrorKind.INVALID_REQUEST,
            provider_key=provider_key,
        )
    return tool_calls


class LocalHeuristicProvider(BaseAiProvider):
    key = "local"
    capabilities = frozenset(
        {
            AiCapability.TEXT,
            AiCapability.STRUCTURED_OUTPUT,
            AiCapability.STREAMING,
            AiCapability.EMBEDDINGS,
        }
    )

    async def generate_contract(self, request: AiProviderRequest) -> AiProviderResponse:
        prompt = request.user_prompt.strip()
        system = request.system_prompt.strip()
        if request.response_format == "json":
            output_json = {
                "claims": [],
                "no_evidence": True,
                "insufficient_evidence_reason": (
                    "Local heuristic provider cannot synthesize grounded claims."
                ),
            }
            output_text = json.dumps(output_json, indent=2)
        else:
            output_json = None
            output_text = (
                f"[{request.model}] Heuristic response\n\n"
                f"System context:\n{system[:400] or 'None'}\n\n"
                f"User prompt:\n{prompt[:1500]}"
            )
        return AiProviderResponse(
            provider_key=self.key,
            model=request.model,
            output_text=output_text,
            output_json=output_json,
            usage=AiUsage(
                input_tokens=estimate_tokens(f"{system}\n{prompt}"),
                output_tokens=estimate_tokens(output_text),
            ),
            provider_request_id=request.provider_request_id,
        )

    async def embed_texts(self, texts: list[str], model: str | None = None) -> list[list[float]]:
        return [
            _hash_embedding(text, dimensions=settings.RAG_EMBEDDING_DIMENSIONS) for text in texts
        ]

    async def stream_contract(self, request: AiProviderRequest) -> AsyncIterator[AiStreamEvent]:
        response = await self.generate_contract(request)
        run_id = request.metadata.get("run_id", request.provider_request_id)
        yield AiRunStartedEvent(
            run_id=run_id, sequence=0, provider_key=self.key, model=request.model
        )
        sequence = 1
        for part in (
            response.output_text[index : index + 96]
            for index in range(0, len(response.output_text), 96)
        ):
            yield AiTextDeltaEvent(run_id=run_id, sequence=sequence, delta=part)
            sequence += 1
        yield AiRunCompletedEvent(run_id=run_id, sequence=sequence, response=response)


class HttpAiProvider(BaseAiProvider):
    base_url: str

    def __init__(self, *, base_url: str, api_key: str, key: str) -> None:
        self.base_url = base_url
        self.api_key = api_key
        self.key = key

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.api_key}"}

    def _client(self) -> httpx.AsyncClient:
        return _provider_http_client(self.base_url)

    async def _post_json(
        self, path: str, request: AiProviderRequest, payload: dict[str, Any]
    ) -> dict[str, Any]:
        if not self.api_key:
            raise AiProviderError(
                f"{self.key} API key is not configured",
                kind=AiErrorKind.CONFIGURATION,
                provider_key=self.key,
            )

        async def operation() -> dict[str, Any]:
            try:
                response = await self._client().post(path, headers=self._headers(), json=payload)
            except httpx.TimeoutException as exc:
                raise AiProviderError(
                    "Provider request timed out",
                    kind=AiErrorKind.TIMEOUT,
                    provider_key=self.key,
                    retryable=True,
                ) from exc
            except httpx.HTTPError as exc:
                raise AiProviderError(
                    "Provider transport failed",
                    kind=AiErrorKind.TRANSIENT,
                    provider_key=self.key,
                    retryable=True,
                ) from exc
            if response.status_code >= 400:
                kind, retryable = classify_http_status(response.status_code)
                raise AiProviderError(
                    f"{self.key} request failed",
                    kind=kind,
                    provider_key=self.key,
                    status_code=response.status_code,
                    provider_request_id=response.headers.get("x-request-id"),
                    retryable=retryable,
                )
            try:
                return response.json()
            except ValueError as exc:
                raise AiProviderError(
                    "Provider returned invalid JSON",
                    kind=AiErrorKind.PROVIDER,
                    provider_key=self.key,
                    retryable=False,
                ) from exc

        return await execute_provider_call(
            provider_key=self.key,
            model=request.model,
            operation=operation,
            timeout_seconds=request.timeout_seconds,
        )


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
                "stream": True,
            }
        else:
            payload = {
                "model": request.model,
                "messages": _openai_messages(request),
                "temperature": request.temperature,
                "stream": True,
            }
        sequence = 1
        async with self._client().stream(
            "POST", path, headers=self._headers(), json=payload
        ) as response:
            if response.status_code >= 400:
                kind, retryable = classify_http_status(response.status_code)
                raise AiProviderError(
                    "openai streaming request failed",
                    kind=kind,
                    provider_key=self.key,
                    status_code=response.status_code,
                    retryable=retryable,
                )
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
            if response.status_code >= 400:
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


class AiProviderRegistry:
    def __init__(self):
        providers: list[BaseAiProvider] = [
            LocalHeuristicProvider(),
            OpenAIProvider(),
            AnthropicProvider(),
        ]
        if settings.AI_COMPATIBLE_BASE_URL:
            providers.append(OpenAICompatibleProvider())
        self._providers = {provider.key: provider for provider in providers}

    def get(self, key: str | None) -> BaseAiProvider:
        provider_key = (key or settings.AI_DEFAULT_PROVIDER).strip().lower()
        provider = self._providers.get(provider_key)
        if not provider:
            raise AiProviderError(
                f"Unknown AI provider: {provider_key}",
                kind=AiErrorKind.INVALID_REQUEST,
                provider_key=provider_key,
            )
        return provider

    def descriptors(self) -> list[dict[str, Any]]:
        return [
            {
                "key": provider.key,
                "label": provider.key.replace("_", " ").title(),
                "supports_generation": AiCapability.TEXT in provider.capabilities,
                "supports_embeddings": AiCapability.EMBEDDINGS in provider.capabilities,
                "capabilities": sorted(capability.value for capability in provider.capabilities),
            }
            for provider in sorted(self._providers.values(), key=lambda item: item.key)
        ]

    def embedding_provider_and_model(self) -> tuple[BaseAiProvider, str]:
        provider = self.get(
            settings.AI_EMBEDDING_PROVIDER or settings.RAG_EMBEDDING_PROVIDER or "local"
        )
        model = (
            settings.OPENAI_EMBEDDING_MODEL
            if provider.key == "openai"
            else settings.AI_LOCAL_MODEL_NAME
        )
        return provider, model

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        provider, model = self.embedding_provider_and_model()
        return await provider.embed_texts(texts, model=model)

    async def embed_retrieval_queries(self, texts: list[str]) -> list[list[float]]:
        from backend.lib.embedding_cache import embed_texts_with_cache

        provider, model = self.embedding_provider_and_model()
        return await embed_texts_with_cache(
            provider=provider.key,
            model=model,
            texts=texts,
            embed_fn=lambda miss: provider.embed_texts(miss, model=model),
            dimensions=settings.RAG_EMBEDDING_DIMENSIONS,
            ttl_seconds=settings.CACHE_QUERY_EMBEDDING_TTL_SECONDS,
        )
