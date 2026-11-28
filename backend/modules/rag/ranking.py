from __future__ import annotations

import asyncio
from dataclasses import dataclass, replace

from backend.modules.rag.contracts import (
    MAX_RERANK_CANDIDATES,
    MIN_RERANK_CANDIDATES,
    NoOpReranker,
    RerankerPort,
    UnicodeHeuristicReranker,
    build_reranker,
)
from backend.modules.rag.domain import RetrievalCoverage, RetrievedChunk


class HybridRetrievalRanker:
    """Legacy name kept for eval baselines; Unicode-aware, no RRF score mixing."""

    def __init__(self) -> None:
        self._impl = UnicodeHeuristicReranker()

    def rerank(
        self,
        query: str,
        chunks: list[RetrievedChunk],
        *,
        limit: int,
    ) -> list[RetrievedChunk]:
        return self._impl.rerank(query, chunks, limit=limit)


__all__ = [
    "HybridRetrievalRanker",
    "NoOpReranker",
    "UnicodeHeuristicReranker",
    "build_reranker",
]


def reciprocal_rank_fusion(
    ranked_lists: list[list[RetrievedChunk]],
    *,
    k: int = 60,
    limit: int,
) -> list[RetrievedChunk]:
    scores: dict[str, float] = {}
    best: dict[str, RetrievedChunk] = {}
    sources: dict[str, set[str]] = {}

    for list_index, ranked in enumerate(ranked_lists):
        source_name = f"list-{list_index}"
        seen_in_list: set[str] = set()
        for chunk in ranked:
            sources.setdefault(chunk.chunk_id, set()).update(
                chunk.retrieval_sources or (source_name,)
            )
            if chunk.chunk_id in seen_in_list:
                continue
            seen_in_list.add(chunk.chunk_id)
            scores[chunk.chunk_id] = scores.get(chunk.chunk_id, 0.0) + 1.0 / (k + len(seen_in_list))
            # Each branch's score has its own scale. Use the first canonical hit.
            best.setdefault(chunk.chunk_id, chunk)

    ordered = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    fused: list[RetrievedChunk] = []
    for rank, (chunk_id, score) in enumerate(ordered[:limit], start=1):
        chunk = best[chunk_id]
        fused.append(
            replace(
                chunk,
                score=round(score, 6),
                rank=rank,
                used_in_answer=False,
                retrieval_sources=tuple(sorted(sources.get(chunk_id, set()))),
            )
        )
    return fused


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


def diversify_by_document(
    chunks: list[RetrievedChunk],
    *,
    limit: int,
    max_per_document: int,
    documents_in_scope: int,
    prefer_coverage: bool = False,
) -> tuple[list[RetrievedChunk], RetrievalCoverage]:
    if prefer_coverage:
        first, rest = [], []
        seen: set[str] = set()
        for chunk in chunks:
            (rest if chunk.document_id in seen else first).append(chunk)
            seen.add(chunk.document_id)
        chunks = [*first, *rest]
    selected: list[RetrievedChunk] = []
    per_doc: dict[str, int] = {}
    for chunk in chunks:
        count = per_doc.get(chunk.document_id, 0)
        if count >= max_per_document:
            continue
        per_doc[chunk.document_id] = count + 1
        selected.append(replace(chunk, rank=len(selected) + 1))
        if len(selected) >= limit:
            break

    docs_with_evidence = len({c.document_id for c in selected})
    coverage = RetrievalCoverage(
        documents_in_scope=documents_in_scope,
        documents_with_retrieved_evidence=docs_with_evidence,
        retrieved_passage_count=len(selected),
        coverage_ratio=(docs_with_evidence / documents_in_scope if documents_in_scope > 0 else 0.0),
    )
    return selected, coverage


def filter_to_allow_list(
    chunks: list[RetrievedChunk],
    document_ids: list[str] | None,
) -> list[RetrievedChunk]:
    """Invariant I5: drop any candidate outside the resolved allow-list."""
    if document_ids is None:
        return chunks
    allowed = set(document_ids)
    return [c for c in chunks if c.document_id in allowed]
