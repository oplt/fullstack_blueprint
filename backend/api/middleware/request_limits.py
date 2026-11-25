"""ASGI request-size enforcement that also covers chunked bodies."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any

from backend.core.config import settings


class RequestBodyLimitMiddleware:
    def __init__(self, app: Callable[..., Awaitable[Any]]) -> None:
        self.app = app

    async def __call__(self, scope: dict[str, Any], receive: Callable, send: Callable) -> None:
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers", []))
        content_length = headers.get(b"content-length")
        if content_length:
            try:
                if int(content_length) > settings.MAX_REQUEST_BODY_BYTES:
                    await self._reject(send)
                    return
            except ValueError:
                await self._reject(send)
                return

        received = 0
        rejected = False

        async def limited_receive() -> dict[str, Any]:
            nonlocal received, rejected
            message = await receive()
            if message.get("type") == "http.request":
                body = message.get("body", b"")
                received += len(body)
                if received > settings.MAX_REQUEST_BODY_BYTES:
                    rejected = True
                    return {"type": "http.disconnect"}
            return message

        await self.app(scope, limited_receive, send)
        if rejected:
            # The application may already have started a response for a malformed
            # chunked body; size enforcement remains deterministic for headers.
            return

    @staticmethod
    async def _reject(send: Callable) -> None:
        await send(
            {
                "type": "http.response.start",
                "status": 413,
                "headers": [(b"content-type", b"application/json")],
            }
        )
        await send(
            {
                "type": "http.response.body",
                "body": b'{"detail":"Request body too large"}',
            }
        )
