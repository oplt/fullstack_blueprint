"""Shared HTTP lifecycle and provider contract helpers."""

from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncIterator
from http import HTTPStatus
from typing import Any

import httpx

from backend.core.config import settings
from backend.modules.ai.contracts import (
    AiCapability,
    AiProviderRequest,
    AiProviderResponse,
    AiStreamEvent,
    AiToolCall,
)
from backend.modules.ai.errors import AiErrorKind, AiProviderError, classify_http_status
from backend.modules.ai.reliability import execute_provider_call

_http_clients: dict[tuple[asyncio.AbstractEventLoop, str], httpx.AsyncClient] = {}


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


class BaseAiProvider:
    key = "base"
    capabilities: frozenset[AiCapability] = frozenset({AiCapability.TEXT})

    async def generate_contract(self, request: AiProviderRequest) -> AiProviderResponse:
        raise NotImplementedError

    def stream_contract(self, _request: AiProviderRequest) -> AsyncIterator[AiStreamEvent]:
        raise AiProviderError(
            "Streaming is not supported by this provider",
            kind=AiErrorKind.INVALID_REQUEST,
            provider_key=self.key,
        )

    def stream(self, request: AiProviderRequest) -> AsyncIterator[AiStreamEvent]:
        return self.stream_contract(request)

    async def embed_texts(self, texts: list[str], model: str | None = None) -> list[list[float]]:
        raise NotImplementedError


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
            if response.status_code >= HTTPStatus.BAD_REQUEST:
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
