from __future__ import annotations

import json
from collections.abc import Callable
from dataclasses import dataclass, replace
from enum import StrEnum
from typing import TYPE_CHECKING

from backend.core.prompt_context import RAG_UNTRUSTED_CONTEXT_RULE, render_reference_data
from backend.core.vectors import estimate_tokens
from backend.modules.rag.citations import CitationService, citation_text
from backend.modules.rag.domain import RetrievedChunk


class ContextOrderingPolicy(StrEnum):
    """Explicit context packing order after overlap de-duplication."""

    RELEVANCE = "relevance"
    GROUPED_BY_DOCUMENT = "grouped_by_document"
    CHRONOLOGY_WHEN_METADATA = "chronology_when_metadata"


@dataclass(frozen=True, slots=True)
class ContextSelection:
    chunks: list[RetrievedChunk]
    removed_chunk_ids: list[str]
    selected_chunk_ids: list[str]
    ordering_policy: ContextOrderingPolicy = ContextOrderingPolicy.RELEVANCE
    budget_removed_chunk_ids: list[str] | None = None
    context_token_count: int = 0

    def provenance(self) -> dict:
        return {
            "selected_chunk_ids": list(self.selected_chunk_ids),
            "removed_chunk_ids": list(self.removed_chunk_ids),
            "deduplicated_chunk_ids": list(self.removed_chunk_ids),
            "context_token_count": self.context_token_count,
            "context_truncations": {
                chunk.chunk_id: {
                    key: chunk.metadata[key]
                    for key in (
                        "context_truncated",
                        "original_context_tokens",
                        "included_context_tokens",
                    )
                }
                for chunk in self.chunks
                if chunk.metadata.get("context_truncated")
            },
            "budget_removed_chunk_ids": list(self.budget_removed_chunk_ids or []),
            "ordering_policy": self.ordering_policy.value,
        }


def select_context_chunks(
    chunks: list[RetrievedChunk],
    *,
    overlap_threshold: float = 0.8,
    ordering_policy: ContextOrderingPolicy | str = ContextOrderingPolicy.RELEVANCE,
) -> ContextSelection:
    """Keep the best anchor for duplicate content or substantially overlapping spans."""
    policy = ContextOrderingPolicy(ordering_policy)
    selected: list[RetrievedChunk] = []
    removed: list[str] = []
    for chunk in sorted(chunks, key=_priority):
        duplicate_of = next(
            (kept for kept in selected if duplicates_evidence(chunk, kept, overlap_threshold)),
            None,
        )
        if duplicate_of is None:
            selected.append(chunk)
            continue
        removed.append(chunk.chunk_id)
        metadata = dict(duplicate_of.metadata)
        metadata["context_selection_removed_chunk_ids"] = sorted(
            set(metadata.get("context_selection_removed_chunk_ids", [])) | {chunk.chunk_id}
        )
        selected[selected.index(duplicate_of)] = replace(duplicate_of, metadata=metadata)

    ordered = order_context_chunks(selected, policy=policy)
    return ContextSelection(
        chunks=ordered,
        removed_chunk_ids=removed,
        selected_chunk_ids=[chunk.chunk_id for chunk in ordered],
        ordering_policy=policy,
    )


def order_context_chunks(
    chunks: list[RetrievedChunk],
    *,
    policy: ContextOrderingPolicy | str = ContextOrderingPolicy.RELEVANCE,
) -> list[RetrievedChunk]:
    """Apply an explicit, deterministic ordering policy."""
    resolved = ContextOrderingPolicy(policy)
    if resolved == ContextOrderingPolicy.RELEVANCE:
        return sorted(chunks, key=_priority)
    if resolved == ContextOrderingPolicy.GROUPED_BY_DOCUMENT:
        by_document: dict[str, list[RetrievedChunk]] = {}
        for chunk in sorted(chunks, key=_priority):
            by_document.setdefault(chunk.document_id, []).append(chunk)
        document_order = sorted(
            by_document,
            key=lambda document_id: _priority(by_document[document_id][0]),
        )
        return [chunk for document_id in document_order for chunk in by_document[document_id]]
    # chronology_when_metadata: use page/date when present, otherwise relevance.
    if any(_has_chronology(chunk) for chunk in chunks):
        return sorted(chunks, key=lambda chunk: (*_chronology_sort_key(chunk), *_priority(chunk)))
    return sorted(chunks, key=_priority)


def _priority(chunk: RetrievedChunk) -> tuple[int, float, str]:
    return (chunk.rank if chunk.rank is not None else 2**31 - 1, -chunk.score, chunk.chunk_id)


def _has_chronology(chunk: RetrievedChunk) -> bool:
    return _chronology_sort_key(chunk)[0] == 0


def _chronology_sort_key(chunk: RetrievedChunk) -> tuple[int, str]:
    metadata = chunk.metadata or {}
    for key in ("published_at", "document_date", "date", "timestamp"):
        value = metadata.get(key)
        if isinstance(value, (int, float)):
            return (0, f"{value:020.6f}")
        if isinstance(value, str) and value.strip():
            return (0, value.strip())
    if chunk.page_number is not None:
        return (0, f"{chunk.page_number:020d}")
    page = metadata.get("page_number")
    if isinstance(page, (int, float)):
        return (0, f"{int(page):020d}")
    return (1, "")


def duplicates_evidence(left: RetrievedChunk, right: RetrievedChunk, threshold: float) -> bool:
    if (
        left.document_id != right.document_id
        or _revision(left) != _revision(right)
        or left.page_number != right.page_number
    ):
        return False
    if left.chunk_id == right.chunk_id:
        return True
    left_table, right_table = _table_rows(left), _table_rows(right)
    if left_table or right_table:
        return left_table == right_table
    left_hash = left.metadata.get("content_hash")
    right_hash = right.metadata.get("content_hash")
    left_scope = left.metadata.get("offset_scope_id")
    if left_scope != right.metadata.get("offset_scope_id"):
        return False
    if left_hash and left_hash == right_hash:
        return True
    left_spans, right_spans = _span_ids(left), _span_ids(right)
    return bool(
        left_spans
        and right_spans
        and len(left_spans & right_spans) / len(left_spans | right_spans) >= threshold
    )


def _revision(chunk: RetrievedChunk) -> str | None:
    return (
        chunk.index_revision_id
        or chunk.metadata.get("document_revision")
        or chunk.metadata.get("revision_id")
    )


def _table_rows(chunk: RetrievedChunk) -> tuple | None:
    metadata = chunk.metadata
    if "table_block_id" not in metadata or "table_row_start" not in metadata:
        return None
    return (
        metadata.get("sheet_id"),
        metadata["table_block_id"],
        metadata["table_row_start"],
        metadata.get("table_row_end"),
    )


def _span_ids(chunk: RetrievedChunk) -> set[str]:
    return set(chunk.metadata.get("source_span_ids") or ())


RAG_CONTEXT_HEADER = "## Relevant document context\n"





class RagContextBuilder:
    def __init__(self, citation_service: CitationService | None = None):
        self.citations = citation_service or CitationService()

    @staticmethod
    def trim_chunks_to_token_budget(
        chunks: list[RetrievedChunk],
        *,
        max_tokens: int,
        reserved_tokens: int = 512,
        overlap_dedupe_threshold: float = 0.8,
        ordering_policy: ContextOrderingPolicy | str = ContextOrderingPolicy.RELEVANCE,
    ) -> list[RetrievedChunk]:
        """Keep highest-scoring chunks that fit within the context token budget."""
        return RagContextBuilder.select_context_for_generation(
            chunks,
            max_tokens=max_tokens,
            reserved_tokens=reserved_tokens,
            overlap_dedupe_threshold=overlap_dedupe_threshold,
            ordering_policy=ordering_policy,
        ).chunks

    @staticmethod
    def select_context_for_generation(
        chunks: list[RetrievedChunk],
        *,
        max_tokens: int,
        reserved_tokens: int = 512,
        overlap_dedupe_threshold: float = 0.8,
        ordering_policy: ContextOrderingPolicy | str = ContextOrderingPolicy.RELEVANCE,
        token_counter: Callable[[str], int] = estimate_tokens,
    ) -> ContextSelection:
        """Deduplicate, order, and pack chunks while recording selected/removed provenance."""
        if not chunks or max_tokens <= 0:
            return ContextSelection(
                chunks=[],
                removed_chunk_ids=[],
                selected_chunk_ids=[],
                ordering_policy=ContextOrderingPolicy(ordering_policy),
                budget_removed_chunk_ids=[chunk.chunk_id for chunk in chunks],
            )
        budget = max(0, max_tokens - max(0, reserved_tokens))
        if budget <= 0:
            return ContextSelection(
                chunks=[],
                removed_chunk_ids=[],
                selected_chunk_ids=[],
                ordering_policy=ContextOrderingPolicy(ordering_policy),
                budget_removed_chunk_ids=[chunk.chunk_id for chunk in chunks],
            )

        selection = select_context_chunks(
            chunks,
            overlap_threshold=overlap_dedupe_threshold,
            ordering_policy=ordering_policy,
        )
        packed: list[RetrievedChunk] = []
        budget_removed: list[str] = []
        builder = RagContextBuilder()

        def token_count(items: list[RetrievedChunk]) -> int:
            return token_counter(builder.build_document_context_block(items))

        for chunk in selection.chunks:
            candidate = chunk
            if token_count([*packed, candidate]) > budget and candidate.context_content is not None:
                # Prefer the exact child anchor when the optional parent will not fit.
                candidate = replace(candidate, context_content=None, parent_context_id=None)
            if token_count([*packed, candidate]) > budget:
                budget_removed.append(candidate.chunk_id)
                continue
            packed.append(candidate)
        return ContextSelection(
            chunks=packed,
            removed_chunk_ids=selection.removed_chunk_ids,
            selected_chunk_ids=[chunk.chunk_id for chunk in packed],
            ordering_policy=selection.ordering_policy,
            budget_removed_chunk_ids=budget_removed,
            context_token_count=token_count(packed),
        )

    def build_document_context_block(self, chunks: list[RetrievedChunk]) -> str:
        if not chunks:
            return ""

        references = []
        for chunk in chunks:
            coordinates = {
                key: chunk.metadata[key]
                for key in (
                    "section_heading",
                    "section_path",
                    "char_start",
                    "char_end",
                    "offset_scope_id",
                    "source_span_ids",
                    "table_headers",
                    "table_row_start",
                    "table_row_end",
                    "sheet_id",
                )
                if key in chunk.metadata
            }
            entry = {
                "document_id": chunk.document_id,
                "chunk_id": chunk.chunk_id,
                "revision_id": chunk.index_revision_id,
                "filename": chunk.filename,
                "page_number": chunk.page_number,
                "coordinates": coordinates,
                "content": citation_text(chunk),
            }
            if chunk.context_content is not None and not chunk.metadata.get("context_truncated"):
                entry["neighboring_context"] = chunk.context_content
            references.append(entry)
        data = render_reference_data("untrusted_documents", references)
        return f"{RAG_CONTEXT_HEADER}{RAG_UNTRUSTED_CONTEXT_RULE}\n{data}"

    def build_combined_context(
        self,
        *,
        memory_context: str | None,
        document_context: str,
        user_question: str,
    ) -> str:
        parts: list[str] = []
        if memory_context:
            parts.append(memory_context)
        if document_context:
            parts.append(document_context)
        parts.append(f"User question:\n{user_question}")
        return "\n\n".join(part for part in parts if part.strip())

    @staticmethod
    def assemble_agent_system_context(
        *,
        memory_context: str | None,
        document_context: str | None,
    ) -> str | None:
        """Merge memory and document blocks for agent system prompt injection."""
        parts = [part for part in (memory_context, document_context) if part and part.strip()]
        return "\n\n".join(parts) or None


if TYPE_CHECKING:
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
