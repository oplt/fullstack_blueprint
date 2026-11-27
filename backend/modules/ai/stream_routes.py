from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import settings
from backend.dependencies.auth import get_current_user
from backend.dependencies.db import get_db
from backend.modules.ai.contracts import (
    AiMessage,
    AiMessageRole,
    AiProviderRequest,
    AiRunFailedEvent,
    AiTaskType,
)
from backend.modules.ai.dependencies import enforce_ai_generation_rate_limit
from backend.modules.ai.errors import AiErrorKind, AiProviderError
from backend.modules.ai.providers import AiProviderRegistry
from backend.modules.ai.routing import ModelRegistry, RoutingPolicy
from backend.modules.ai.schemas import AiStreamRequest
from backend.modules.ai.stream_service import AiStreamService
from backend.modules.ai.streaming import AiStreamingService, sse_encode
from backend.modules.identity_access.models import User

router = APIRouter()


@router.post("/stream")
async def stream_ai_run(
    payload: AiStreamRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _rate_limit: None = Depends(enforce_ai_generation_rate_limit),
):
    try:
        provider = AiProviderRegistry().get(payload.provider_key)
        model_spec = ModelRegistry().route(
            task=AiTaskType.GENERATION,
            policy=RoutingPolicy(
                region=settings.AI_DEFAULT_REGION or None,
                cost_budget_micros=settings.AI_TENANT_MAX_COST_MICROS,
            ),
            requested_provider=payload.provider_key,
            requested_model=payload.model,
        )
    except AiProviderError as exc:
        status_code = {
            AiErrorKind.INVALID_REQUEST: 422,
            AiErrorKind.BUDGET_EXCEEDED: 429,
            AiErrorKind.CONFIGURATION: 422,
        }.get(exc.kind, 503)
        raise HTTPException(
            status_code=status_code,
            detail="AI provider request could not be routed",
        ) from exc
    service = AiStreamService(db)
    run = await service.create_run(
        current_user,
        provider_key=provider.key,
        model_name=model_spec.model_id,
        response_format=payload.response_format,
        system_prompt=payload.system_prompt,
        user_prompt=payload.user_prompt,
    )

    provider_request = AiProviderRequest(
        model=run.model_name,
        messages=[
            AiMessage(role=AiMessageRole.SYSTEM, content=payload.system_prompt),
            AiMessage(role=AiMessageRole.USER, content=payload.user_prompt),
        ],
        response_format=payload.response_format,
        temperature=payload.temperature,
        max_output_tokens=min(
            payload.max_output_tokens or settings.AI_MAX_OUTPUT_TOKENS,
            model_spec.max_output_tokens,
        ),
        timeout_seconds=settings.AI_REQUEST_TIMEOUT_SECONDS,
        tools=payload.tools,
        metadata={"run_id": run.id, "user_id": current_user.id, "provider_key": provider.key},
    )

    async def generate() -> AsyncIterator[str]:
        text_parts: list[str] = []
        last_sequence = 0
        try:
            async for event in AiStreamingService().stream(provider, provider_request):
                if await request.is_disconnected():
                    raise asyncio.CancelledError
                last_sequence = event.sequence
                if event.type == "text.delta":
                    text_parts.append(event.delta)  # type: ignore[attr-defined]
                if event.type == "run.completed":
                    completed = event.response  # type: ignore[attr-defined]
                    run.output_text = "".join(text_parts) or completed.output_text
                    run.input_tokens = completed.usage.input_tokens
                    run.output_tokens = completed.usage.output_tokens
                    run.total_tokens = completed.usage.total_tokens
                    run.provider_request_id = completed.provider_request_id
                yield sse_encode(event)
            await service.complete_run(
                run,
                output_text="".join(text_parts),
                input_tokens=run.input_tokens,
                output_tokens=run.output_tokens,
                provider_request_id=run.provider_request_id,
            )
        except asyncio.CancelledError:
            await service.complete_run(
                run,
                output_text="".join(text_parts),
                input_tokens=run.input_tokens,
                output_tokens=run.output_tokens,
                provider_request_id=run.provider_request_id,
                status="cancelled",
                error_message="AI stream cancelled",
            )
            raise
        except Exception as exc:
            error_type = exc.kind.value if isinstance(exc, AiProviderError) else "provider"
            safe_message = "AI provider execution failed"
            yield sse_encode(
                AiRunFailedEvent(
                    run_id=run.id,
                    sequence=last_sequence + 1,
                    error_type=error_type,
                    message=safe_message,
                )
            )
            await service.complete_run(
                run,
                output_text="".join(text_parts),
                input_tokens=run.input_tokens,
                output_tokens=run.output_tokens,
                provider_request_id=run.provider_request_id,
                status="failed",
                error_message=safe_message,
            )

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-store",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "X-AI-Stream-Protocol": "1",
        },
    )
