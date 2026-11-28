"""Expand child chunks to parent context when parent_chunk_id is set (I5 allow-list)."""

from __future__ import annotations

import json
from dataclasses import replace

from backend.modules.rag.domain import RetrievedChunk
from backend.modules.rag.repository import RagRepository


def _eligible_parent(parent, child, chunk: RetrievedChunk, max_tokens: int) -> bool:
    revision = getattr(child, "revision_id", None)
    if (
        parent.document_id != chunk.document_id
        or parent.chunk_index >= 0
        or getattr(parent, "revision_id", None) != revision
        or (chunk.index_revision_id is not None and chunk.index_revision_id != revision)
        or getattr(parent, "token_count", 0) > max_tokens
    ):
        return False
    try:
        metadata = json.loads(getattr(parent, "metadata_json", None) or "{}")
    except (TypeError, ValueError):
        return False
    return isinstance(metadata, dict) and not metadata.get("prompt_injection_suspected")


async def expand_parent_chunks(
    chunks: list[RetrievedChunk],
    *,
    repo: RagRepository,
    user_id: str,
    project_id: str | None,
    document_ids: list[str] | None,
    max_parent_tokens: int = 2000,
) -> list[RetrievedChunk]:
    """Expand child hits with parent text; dedupe when several children share a parent.

    Citations keep the child chunk_id that caused retrieval. Parents outside
    ``document_ids`` are ignored (I5).
    """
    if not chunks:
        return chunks

    scope = {
        "user_id": user_id,
        "project_id": project_id,
        "document_ids": document_ids,
    }
    child_rows = await repo.get_chunks_by_ids_for_scope([c.chunk_id for c in chunks], **scope)
    child_by_id = {row.id: row for row in child_rows}
    parent_ids = [
        row.parent_chunk_id
        for chunk in chunks
        if (row := child_by_id.get(chunk.chunk_id)) is not None
        and getattr(row, "document_id", None) == chunk.document_id
        and getattr(row, "parent_chunk_id", None)
    ]
    if not parent_ids:
        return chunks

    parents = await repo.get_chunks_by_ids_for_scope(
        list({pid for pid in parent_ids if pid}), **scope
    )
    parent_by_id = {row.id: row for row in parents}

    expanded: list[RetrievedChunk] = []
    seen_parents: set[str] = set()
    allowed_documents = set(document_ids) if document_ids is not None else None
    for chunk in chunks:
        child = child_by_id.get(chunk.chunk_id)
        parent = (
            parent_by_id.get(child.parent_chunk_id) if child and child.parent_chunk_id else None
        )
        if (
            child is None
            or child.document_id != chunk.document_id
            or (allowed_documents is not None and chunk.document_id not in allowed_documents)
            or parent is None
            or not _eligible_parent(parent, child, chunk, max_parent_tokens)
        ):
            expanded.append(chunk)
            continue
        expanded.append(_with_parent(chunk, parent, duplicate=parent.id in seen_parents))
        seen_parents.add(parent.id)
    return expanded


def _with_parent(chunk: RetrievedChunk, parent, *, duplicate: bool) -> RetrievedChunk:
    citation_id = chunk.citation_chunk_id or chunk.chunk_id
    metadata = {
        **chunk.metadata,
        "citation_chunk_id": citation_id,
        "parent_context_id": parent.id,
        "parent_expanded": True,
    }
    if duplicate:
        metadata["parent_deduped"] = True
    else:
        metadata["retrieved_child_chunk_id"] = chunk.chunk_id
    return replace(
        chunk,
        metadata=metadata,
        citation_content=chunk.citation_content or chunk.content,
        citation_chunk_id=citation_id,
        context_content=None if duplicate else parent.content,
        parent_context_id=parent.id,
        retrieval_sources=(
            chunk.retrieval_sources
            if duplicate
            else tuple(dict.fromkeys([*chunk.retrieval_sources, "parent_expand"]))
        ),
    )
