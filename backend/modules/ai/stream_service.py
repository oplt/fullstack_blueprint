from __future__ import annotations

from datetime import UTC, datetime
from hashlib import sha256

from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.ai.models import AiRun
from backend.modules.ai.repository import AiRepository
from backend.modules.ai.routing import ModelRegistry, estimate_cost_micros
from backend.modules.identity.models import User


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
