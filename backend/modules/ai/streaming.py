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
from backend.modules.ai.errors import AiErrorKind, AiProviderError
from backend.modules.ai.providers import BaseAiProvider
from datetime import UTC, datetime
from hashlib import sha256
from sqlalchemy.ext.asyncio import AsyncSession
from backend.modules.ai.models import AiRun
from backend.modules.ai.repository import AiRepository
from backend.modules.ai.routing import ModelRegistry, estimate_cost_micros
from backend.modules.identity.models import User


AI_STREAM_PROTOCOL_VERSION = "1"
MAX_AI_STREAM_EVENT_BYTES = 64 * 1024


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
        collected_text: list[str] = []
        completed: AiRunCompletedEvent | None = None
        sequence = 0
        async for event in self._provider_events(provider, request):
            sequence = event.sequence
            if isinstance(event, AiTextDeltaEvent):
                collected_text.append(event.delta)
            if isinstance(event, AiRunCompletedEvent):
                completed = event
            yield event

        if completed is None:
            output_text = "".join(collected_text)
            yield AiRunCompletedEvent(
                run_id=request.metadata.get("run_id", request.provider_request_id),
                sequence=sequence + 1,
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

    async def _provider_events(
        self,
        provider: BaseAiProvider,
        request: AiProviderRequest,
    ) -> AsyncIterator[AiStreamEvent]:
        stream = provider.stream_contract(request).__aiter__()
        next_event = asyncio.ensure_future(stream.__anext__())
        heartbeat = asyncio.ensure_future(asyncio.sleep(self.heartbeat_seconds))
        output_characters = 0
        output_limit = (request.max_output_tokens or settings.AI_MAX_OUTPUT_TOKENS) * 8
        sequence = 0
        try:
            async with asyncio.timeout(
                request.timeout_seconds or settings.AI_REQUEST_TIMEOUT_SECONDS
            ):
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
                        output_characters = self._check_event(
                            normalized,
                            provider=provider,
                            output_characters=output_characters,
                            output_limit=output_limit,
                        )
                        yield normalized
                        next_event = asyncio.ensure_future(stream.__anext__())
        except TimeoutError as exc:
            raise AiProviderError(
                "Provider stream timed out",
                kind=AiErrorKind.TIMEOUT,
                provider_key=provider.key,
                retryable=True,
            ) from exc
        finally:
            for task in (next_event, heartbeat):
                if not task.done():
                    task.cancel()
            await asyncio.gather(next_event, heartbeat, return_exceptions=True)
            close_stream = getattr(stream, "aclose", None)
            if close_stream is not None:
                await close_stream()

    @staticmethod
    def _check_event(
        event: AiStreamEvent,
        *,
        provider: BaseAiProvider,
        output_characters: int,
        output_limit: int,
    ) -> int:
        if len(sse_encode(event).encode("utf-8")) > MAX_AI_STREAM_EVENT_BYTES:
            raise AiProviderError(
                "Provider stream event exceeded the configured limit",
                kind=AiErrorKind.BUDGET_EXCEEDED,
                provider_key=provider.key,
            )
        if isinstance(event, AiTextDeltaEvent):
            output_characters += len(event.delta)
        elif isinstance(event, AiRunCompletedEvent):
            output_characters = max(output_characters, len(event.response.output_text))
        if output_characters > output_limit:
            raise AiProviderError(
                "Provider output exceeded the configured limit",
                kind=AiErrorKind.BUDGET_EXCEEDED,
                provider_key=provider.key,
            )
        return output_characters


def stream_event_payload(event: AiStreamEvent) -> dict[str, Any]:
    return event.model_dump(mode="json")


class AiStreamService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = AiRepository(db)

    async def create_run(
        self,
        user: User,
        *,
        provider_key: str,
        model_name: str,
        response_format: str,
        system_prompt: str,
        user_prompt: str,
    ) -> AiRun:
        run = await self.repo.create_run(
            user_id=user.id,
            tenant_id=user.id,
            provider_key=provider_key,
            model_name=model_name,
            status="running",
            response_format=response_format,
            variables_json={},
            retrieved_chunk_ids_json=[],
            input_messages_json=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            input_hash=sha256(user_prompt.encode()).hexdigest(),
            routing_policy_json={"source": "stream", "deterministic": True},
            review_status="not_requested",
        )
        await self.db.commit()
        return run

    async def complete_run(
        self,
        run: AiRun,
        *,
        output_text: str,
        input_tokens: int,
        output_tokens: int,
        provider_request_id: str | None,
        status: str = "completed",
        error_message: str | None = None,
    ) -> None:
        run.status = status
        run.output_text = output_text
        run.input_tokens = input_tokens
        run.output_tokens = output_tokens
        run.total_tokens = input_tokens + output_tokens
        run.provider_request_id = provider_request_id
        run.error_message = error_message
        run.completed_at = datetime.now(UTC)
        try:
            spec = ModelRegistry().get(run.provider_key, run.model_name)
            run.estimated_cost_micros = estimate_cost_micros(
                spec, input_tokens=input_tokens, output_tokens=output_tokens
            )
        except Exception:
            run.estimated_cost_micros = 0
        await self.repo.create_usage_record(
            run_id=run.id,
            user_id=run.user_id,
            tenant_id=run.tenant_id,
            provider_key=run.provider_key,
            model_name=run.model_name,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_micros=run.estimated_cost_micros,
        )
        await self.db.commit()
