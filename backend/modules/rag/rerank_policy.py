"""Bounded reranking that preserves useful retrieval results on ranker failure."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass

from backend.modules.rag.domain import RetrievedChunk
from backend.modules.rag.reranker_port import (
    MAX_RERANK_CANDIDATES,
    MIN_RERANK_CANDIDATES,
    RerankerPort,
)


@dataclass(frozen=True, slots=True)
class RerankResult:
    chunks: list[RetrievedChunk]
    failed: bool = False
    attempted: bool = False
    candidate_count: int = 0
    fallback_reason: str | None = None


async def apply_rerank_policy(
    ranker: RerankerPort,
    query: str,
    chunks: list[RetrievedChunk],
    *,
    depth: int,
    timeout_seconds: float = 2.0,
) -> RerankResult:
    """Rerank only a bounded leading window; retain the remainder in original order."""
    bounded_depth = min(depth, len(chunks), MAX_RERANK_CANDIDATES)
    if bounded_depth < MIN_RERANK_CANDIDATES:
        return RerankResult(chunks=chunks)
    window = chunks[:bounded_depth]
    by_id = {chunk.chunk_id: chunk for chunk in window}
    try:
        async with asyncio.timeout(timeout_seconds):
            reranked = await ranker.rank(query, window, limit=bounded_depth)
        ids = [chunk.chunk_id for chunk in reranked]
        if len(ids) != bounded_depth or len(by_id) != bounded_depth or set(ids) != set(by_id):
            raise ValueError("Reranker did not return a permutation of candidate IDs")
    except Exception as exc:
        return RerankResult(
            chunks=chunks,
            failed=True,
            attempted=True,
            candidate_count=bounded_depth,
            fallback_reason=type(exc).__name__,
        )
    return RerankResult(
        chunks=[*(by_id[chunk_id] for chunk_id in ids), *chunks[bounded_depth:]],
        attempted=True,
        candidate_count=bounded_depth,
    )
