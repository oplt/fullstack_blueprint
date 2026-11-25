"""Versioned AI event stream and SSE transport."""

from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncIterator
from typing import Any

from backend.core.config import settings
from backend.modules.ai.contracts import (
    AiHeartbeatEvent,
    AiProviderRequest,
    AiProviderResponse,
    AiRunCompletedEvent,
    AiStreamEvent,
    AiTextDeltaEvent,
    AiUsage,
)
from backend.modules.ai.providers import BaseAiProvider

AI_STREAM_PROTOCOL_VERSION = "1"


def sse_encode(event: AiStreamEvent) -> str:
    payload = event.model_dump(mode="json")
    data = json.dumps(payload, separators=(",", ":"))
    return f"event: {payload['type']}\nid: {payload['sequence']}\ndata: {data}\n\n"


class AiStreamingService:
    def __init__(self, *, heartbeat_seconds: float | None = None) -> None:
        self.heartbeat_seconds = heartbeat_seconds or settings.AI_STREAM_HEARTBEAT_SECONDS

    async def stream(
        self,
        provider: BaseAiProvider,
        request: AiProviderRequest,
    ) -> AsyncIterator[AiStreamEvent]:
        stream = provider.stream_contract(request).__aiter__()
        next_event = asyncio.ensure_future(stream.__anext__())
        heartbeat = asyncio.ensure_future(asyncio.sleep(self.heartbeat_seconds))
        collected_text: list[str] = []
        sequence = 0
        completed: AiRunCompletedEvent | None = None
        try:
            while True:
                done, _ = await asyncio.wait(
                    {next_event, heartbeat},
                    return_when=asyncio.FIRST_COMPLETED,
                )
                if heartbeat in done:
                    sequence += 1
                    yield AiHeartbeatEvent(
                        run_id=request.metadata.get("run_id", request.provider_request_id),
                        sequence=sequence,
                    )
                    heartbeat = asyncio.ensure_future(asyncio.sleep(self.heartbeat_seconds))
                if next_event in done:
                    try:
                        event = next_event.result()
                    except StopAsyncIteration:
                        break
                    sequence = max(sequence + 1, event.sequence)
                    normalized = event.model_copy(update={"sequence": sequence})
                    if isinstance(normalized, AiTextDeltaEvent):
                        collected_text.append(normalized.delta)
                    if isinstance(normalized, AiRunCompletedEvent):
                        completed = normalized
                    yield normalized
                    next_event = asyncio.ensure_future(stream.__anext__())
        finally:
            for task in (next_event, heartbeat):
                if not task.done():
                    task.cancel()
            await asyncio.gather(next_event, heartbeat, return_exceptions=True)
            close_stream = getattr(stream, "aclose", None)
            if close_stream is not None:
                await close_stream()

        if completed is None:
            output_text = "".join(collected_text)
            sequence += 1
            yield AiRunCompletedEvent(
                run_id=request.metadata.get("run_id", request.provider_request_id),
                sequence=sequence,
                response=AiProviderResponse(
                    provider_key=provider.key,
                    model=request.model,
                    output_text=output_text,
                    usage=AiUsage(
                        input_tokens=0,
                        output_tokens=max(0, len(output_text.split())),
                    ),
                    provider_request_id=request.provider_request_id,
                ),
            )


def stream_event_payload(event: AiStreamEvent) -> dict[str, Any]:
    return event.model_dump(mode="json")
