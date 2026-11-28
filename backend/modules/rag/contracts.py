from __future__ import annotations

import re
from collections.abc import Callable
from dataclasses import dataclass
from typing import TYPE_CHECKING, Protocol

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.identity.models import User
from backend.modules.rag.domain import RetrievedChunk

if TYPE_CHECKING:
    from backend.modules.rag.prompts import RagAnswerPromptSpec

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
        from backend.modules.rag.generation import RagAnswerRunService  # noqa: PLC0415 - avoids import cycle

        return RagAnswerRunService(self._db)

    async def prepare_rag_answer(self, user: User) -> RagGenerationPlan:
        from backend.core.config import settings  # noqa: PLC0415 - avoids import cycle
        from backend.modules.ai.errors import AiProviderError  # noqa: PLC0415 - avoids import cycle
        from backend.modules.ai.routing import ModelRegistry  # noqa: PLC0415 - avoids import cycle
        from backend.modules.rag.chunking import (  # noqa: PLC0415 - avoids import cycle
            resolve_generation_token_counter,
        )
        from backend.modules.rag.prompts import resolve_rag_answer_prompt  # noqa: PLC0415 - avoids import cycle

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


# Unicode-aware tokens (letters/numbers across scripts), min length 2.
_UNICODE_TOKEN = re.compile(r"[^\W_]{2,}", re.UNICODE)
MIN_RERANK_CANDIDATES = 2
MAX_RERANK_CANDIDATES = 256


class RerankerPort(Protocol):
    name: str
    version: str

    async def rank(
        self,
        query: str,
        chunks: list[RetrievedChunk],
        *,
        limit: int,
    ) -> list[RetrievedChunk]: ...


class NoOpReranker:
    """Safe default: preserve RRF/dense order without mixing incomparable scales."""

    name = "noop"
    version = "v1"

    async def rank(
        self,
        query: str,
        chunks: list[RetrievedChunk],
        *,
        limit: int,
    ) -> list[RetrievedChunk]:
        del query
        return chunks[:limit]


class UnicodeHeuristicReranker:
    """Optional lexical nudge using Unicode tokens; does not blend raw RRF scores."""

    name = "unicode_heuristic"
    version = "v1"

    async def rank(
        self, query: str, chunks: list[RetrievedChunk], *, limit: int
    ) -> list[RetrievedChunk]:
        return self.rerank(query, chunks, limit=limit)

    def rerank(
        self,
        query: str,
        chunks: list[RetrievedChunk],
        *,
        limit: int,
    ) -> list[RetrievedChunk]:
        terms = set(_UNICODE_TOKEN.findall(query.lower()))
        if not terms or len(chunks) < MIN_RERANK_CANDIDATES:
            return chunks[:limit]

        def key(chunk: RetrievedChunk) -> tuple[float, float, int]:
            content_terms = set(_UNICODE_TOKEN.findall(chunk.content.lower()))
            overlap = len(terms & content_terms) / len(terms)
            # Sort by overlap first, then original score, then original rank.
            return (overlap, chunk.score, -(chunk.rank or 0))

        return sorted(chunks, key=key, reverse=True)[:limit]


def resolve_reranker_mode(config) -> str:
    mode = getattr(config, "rerank_mode", None)
    if mode is None:
        return (
            "heuristic"
            if getattr(config, "rerank_enabled", False)
            and getattr(config, "rerank_heuristic_enabled", False)
            else "none"
        )
    if mode not in {"none", "heuristic", "provider"}:
        raise RuntimeError(f"Reranker mode {mode!r} is unsupported in this runtime")
    return mode


def build_reranker(*, config) -> RerankerPort:
    mode = resolve_reranker_mode(config)
    if mode == "heuristic":
        return UnicodeHeuristicReranker()
    if mode == "provider":
        from backend.core.config import settings  # noqa: PLC0415 - provider resolution
        from backend.modules.rag.cohere_reranker import CohereReranker  # noqa: PLC0415 - optional provider

        return CohereReranker(
            api_key=settings.RAG_COHERE_API_KEY.get_secret_value(), model=config.rerank_model
        )
    return NoOpReranker()
