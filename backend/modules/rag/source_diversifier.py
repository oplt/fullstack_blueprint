"""Source diversification / per-document caps for document synthesis."""

from __future__ import annotations

from dataclasses import replace

from backend.modules.rag.domain import RetrievalCoverage, RetrievedChunk


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
