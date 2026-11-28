"""Reranker port — keep post-RRF scoring pluggable and scale-safe."""

from __future__ import annotations

import re
from typing import Protocol

from backend.modules.rag.domain import RetrievedChunk

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
