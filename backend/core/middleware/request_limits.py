"""ASGI request-size enforcement that also covers chunked bodies."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any

from backend.core.config import settings


class RequestBodyTooLarge(Exception):
    """Raised when a streamed HTTP request exceeds the configured size limit."""


class RequestBodyLimitMiddleware:
    def __init__(self, app: Callable[..., Awaitable[Any]]) -> None:
        self.app = app

    @staticmethod
    def _header_rejection(scope: dict[str, Any]) -> tuple[int, bytes] | None:
        headers = scope.get("headers", [])
        lengths = [value.strip() for key, value in headers if key == b"content-length"]
        has_transfer_encoding = any(key == b"transfer-encoding" for key, _ in headers)
        if lengths and has_transfer_encoding:
            return 400, b'{"detail":"Conflicting request length headers"}'
        if lengths and (len(set(lengths)) != 1 or not lengths[0].isdigit()):
            return 400, b'{"detail":"Invalid Content-Length"}'
        if lengths and int(lengths[0]) > settings.MAX_REQUEST_BODY_BYTES:
            return 413, b'{"detail":"Request body too large"}'
        return None

    async def __call__(self, scope: dict[str, Any], receive: Callable, send: Callable) -> None:
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return
        await self._handle_http(scope, receive, send)

    async def _handle_http(self, scope: dict[str, Any], receive: Callable, send: Callable) -> None:
        rejection = self._header_rejection(scope)
        if rejection:
            await self._reject(send, *rejection)
            return

        received = 0
        response_started = False
        response_complete = False

        async def tracked_send(message: dict[str, Any]) -> None:
            nonlocal response_started, response_complete
            if message.get("type") == "http.response.start":
                response_started = True
            elif message.get("type") == "http.response.body" and not message.get(
                "more_body", False
            ):
                response_complete = True
            await send(message)

        async def limited_receive() -> dict[str, Any]:
            nonlocal received
            message = await receive()
            if message.get("type") == "http.request":
                body = message.get("body", b"")
                received += len(body)
                if received > settings.MAX_REQUEST_BODY_BYTES:
                    raise RequestBodyTooLarge
            return message

        # The application may already have started a response for a malformed
        # chunked body; size enforcement remains deterministic for headers.
        try:
            await self.app(scope, limited_receive, tracked_send)
        except RequestBodyTooLarge:
            await self._finish_after_overflow(send, response_started, response_complete)

    @staticmethod
    async def _finish_after_overflow(
        send: Callable, response_started: bool, response_complete: bool
    ) -> None:
        if response_started:
            if not response_complete:
                await send({"type": "http.response.body", "body": b""})
            return
        await RequestBodyLimitMiddleware._reject(send)

    @staticmethod
    async def _reject(
        send: Callable,
        status: int = 413,
        body: bytes = b'{"detail":"Request body too large"}',
    ) -> None:
        await send(
            {
                "type": "http.response.start",
                "status": status,
                "headers": [(b"content-type", b"application/json")],
            }
        )
        await send(
            {
                "type": "http.response.body",
                "body": body,
            }
        )
