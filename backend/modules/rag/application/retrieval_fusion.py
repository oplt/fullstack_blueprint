"""Pure Reciprocal Rank Fusion over ranked retrieval lists."""

from __future__ import annotations

from dataclasses import replace

from backend.modules.rag.domain.models import RetrievedChunk


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
