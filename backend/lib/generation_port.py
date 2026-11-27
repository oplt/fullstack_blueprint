from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import TYPE_CHECKING, Protocol

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.identity_access.models import User

if TYPE_CHECKING:
    from backend.modules.ai.application.rag_answer_prompt import RagAnswerPromptSpec

RAG_MESSAGE_TOKEN_RESERVE = 128


@dataclass(frozen=True, slots=True)
class RagGenerationPlan:
    prompt: RagAnswerPromptSpec
    context_window: int
    max_output_tokens: int
    token_counter: Callable[[str], int]
    tokenizer: str


@dataclass(slots=True)
class RagGenerationResult:
    id: str
    output_text: str | None
    model_name: str


class GenerationPort(Protocol):
    async def prepare_rag_answer(self, user: User) -> RagGenerationPlan: ...

    async def run_rag_answer(  # noqa: PLR0913 - explicit generation and provenance options
        self,
        user: User,
        *,
        query: str,
        combined_context: str,
        retrieved_chunk_ids: list[str],
        review_required: bool = False,
        retrieval_degraded: bool = False,
        memory_degraded: bool = False,
        degradation_reason: str | None = None,
        injection_chunks_filtered: int = 0,
        commit: bool = True,
        plan: RagGenerationPlan | None = None,
    ) -> RagGenerationResult: ...


class AiRunGenerationPort:
    def __init__(self, db: AsyncSession):
        self._db = db

    def _get_service(self):
        from backend.modules.ai.run_service import AiRunService

        return AiRunService(self._db)

    async def prepare_rag_answer(self, user: User) -> RagGenerationPlan:
        from backend.core.config import settings
        from backend.modules.ai.application.rag_answer_prompt import resolve_rag_answer_prompt
        from backend.modules.ai.errors import AiProviderError
        from backend.modules.ai.routing import ModelRegistry
        from backend.modules.rag.infrastructure.chunk_tokenizers import (
            resolve_generation_token_counter,
        )

        prompt = await resolve_rag_answer_prompt(self._get_service().repo, user)
        try:
            model = ModelRegistry().get(prompt.provider_key, prompt.model_name)
        except AiProviderError as exc:
            raise HTTPException(
                status_code=422, detail="RAG answer model is not registered"
            ) from exc
        output_tokens = min(settings.AI_MAX_OUTPUT_TOKENS, model.max_output_tokens)
        if not model.available:
            raise HTTPException(status_code=422, detail="RAG answer model is unavailable")
        if model.context_window <= output_tokens or output_tokens < 1:
            raise HTTPException(status_code=422, detail="RAG answer model has invalid token limits")
        tokenizer, counter = resolve_generation_token_counter(
            prompt.provider_key, prompt.model_name
        )
        return RagGenerationPlan(prompt, model.context_window, output_tokens, counter, tokenizer)

    async def run_rag_answer(  # noqa: PLR0913 - implements the generation port
        self,
        user: User,
        *,
        query: str,
        combined_context: str,
        retrieved_chunk_ids: list[str],
        review_required: bool = False,
        retrieval_degraded: bool = False,
        memory_degraded: bool = False,
        degradation_reason: str | None = None,
        injection_chunks_filtered: int = 0,
        commit: bool = True,
        plan: RagGenerationPlan | None = None,
    ) -> RagGenerationResult:
        candidate: list[str | None] = []
        run = await self._get_service().run_rag_answer(
            user,
            query=query,
            combined_context=combined_context,
            retrieved_chunk_ids=retrieved_chunk_ids,
            review_required=review_required,
            retrieval_degraded=retrieval_degraded,
            memory_degraded=memory_degraded,
            degradation_reason=degradation_reason,
            injection_chunks_filtered=injection_chunks_filtered,
            commit=commit,
            plan=plan,
            output_capture=candidate,
        )
        return RagGenerationResult(
            id=run.id,
            output_text=candidate[0] if candidate else None,
            model_name=run.model_name,
        )
