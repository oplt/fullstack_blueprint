from __future__ import annotations

import asyncio
from collections.abc import Callable
from uuid import uuid4

from backend.core.vectors import estimate_tokens
from backend.modules.rag.chunk_policy import resolve_chunk_policy
from backend.modules.rag.domain import DocumentChunk, ParsedDocument
from backend.modules.rag.chunk_tokenizers import resolve_token_counter
from backend.modules.rag.langchain_text_splitters import CHUNKER_VERSION, iter_chunks
from backend.modules.rag.config import RagConfig

MIN_PARENT_WINDOW_SIZE = 2


def _split_documents_with_token_counts(
    documents: list[ParsedDocument],
    *,
    config,
    document_revision: str | None = None,
    max_chunks: int,
    max_tokens: int,
) -> list[tuple[str, int, dict]]:
    pieces: list[tuple[str, int, dict]] = []
    total_tokens = 0
    tokenizer, count, input_limit = resolve_token_counter(
        getattr(config, "embedding_provider", ""), getattr(config, "embedding_model", "")
    )
    for document_index, document in enumerate(documents):
        policy = resolve_chunk_policy(document, config)
        table_sources: dict[str, str] = {}
        size = min(policy.target_tokens, input_limit) if input_limit else policy.target_tokens
        overlap = min(policy.overlap_tokens, size - 1) if input_limit else policy.overlap_tokens
        for content, meta in iter_chunks(
            [document],
            chunk_size=size,
            chunk_overlap=overlap,
            document_revision=document_revision,
            token_count=count,
            document_index_start=document_index,
        ):
            if len(pieces) >= max_chunks:
                raise ValueError("Document exceeds the chunk limit")
            token_count = count(content)
            total_tokens += token_count
            if total_tokens > max_tokens:
                raise ValueError("Document exceeds the token limit")
            meta.update(
                chunk_policy_version=policy.version,
                chunk_profile="atomic_table" if "table_block_id" in meta else policy.profile,
                chunk_target_tokens=size,
                chunk_overlap_tokens=0 if "table_block_id" in meta else overlap,
                chunk_tokenizer=tokenizer,
            )
            if (
                getattr(config, "parent_context_enabled", False)
                and meta.get("source_text_exact") is False
            ):
                table_id = meta["table_block_id"]
                if table_id not in table_sources:
                    table_sources[table_id] = document.content[
                        meta["char_start"] : meta["char_end"]
                    ]
                meta["_table_parent_content"] = table_sources[table_id]
            pieces.append((content, token_count, meta))
    return pieces


def _attach_parent_windows(
    leaves: list[DocumentChunk],
    *,
    window: int = 3,
    count: Callable[[str], int] = estimate_tokens,
) -> list[DocumentChunk]:
    """Create parent chunks spanning consecutive leaves; link children via parent_chunk_id."""
    if not leaves:
        return leaves

    out: list[DocumentChunk] = []
    parents: list[DocumentChunk] = []
    groups: list[list[DocumentChunk]] = []
    current: list[DocumentChunk] = []
    current_boundary = None
    for leaf in leaves:
        meta = leaf.metadata
        boundary = (
            leaf.document_id,
            meta.get("document_revision"),
            meta.get("sheet_id"),
            meta.get("structural_parent_id") or meta.get("offset_scope_id"),
        )
        if current and (
            boundary != current_boundary
            or (not current[0].metadata.get("_table_parent_content") and len(current) >= window)
        ):
            groups.append(current)
            current = []
        current.append(leaf)
        current_boundary = boundary
    if current:
        groups.append(current)

    for group in groups:
        first = group[0]
        table_source = first.metadata.get("_table_parent_content")
        if not table_source and (window < MIN_PARENT_WINDOW_SIZE or len(group) == 1):
            out.extend(group)
            continue
        parent_id = str(uuid4())
        parent_content = table_source or _merge_non_overlapping_chunks(group)
        source_indexes = []
        source_span_ids = []
        source_spans = {}
        for child in group:
            source_indexes.extend(child.metadata.get("source_paragraph_indexes") or [])
            source_span_ids.extend(child.metadata.get("source_span_ids") or [])
            for span in child.metadata.get("source_spans") or []:
                source_spans.setdefault(span["source_span_id"], span)
        parent = DocumentChunk(
            id=parent_id,
            document_id=first.document_id,
            user_id=first.user_id,
            chunk_index=-(len(parents) + 1),
            content=parent_content,
            token_count=count(parent_content),
            organization_id=first.organization_id,
            project_id=first.project_id,
            content_hash=None,
            metadata={
                **{
                    k: v
                    for k, v in first.metadata.items()
                    if k
                    not in {
                        "paragraph_index",
                        "_table_parent_content",
                        "content_hash",
                        "chunk_index",
                    }
                },
                "chunk_role": "parent",
                "table_row_end": group[-1].metadata.get("table_row_end"),
                "source_text_exact": bool(table_source),
                "child_count": len(group),
                "source_paragraph_indexes": list(dict.fromkeys(source_indexes)),
                "source_span_ids": list(dict.fromkeys(source_span_ids)),
                "source_unit_ids": list(
                    dict.fromkeys(
                        source_unit_id
                        for child in group
                        for source_unit_id in child.metadata.get("source_unit_ids") or []
                    )
                ),
                "block_ids": list(
                    dict.fromkeys(
                        block_id for child in group for block_id in child.metadata["block_ids"]
                    )
                ),
                "char_start": first.metadata.get("char_start"),
                "char_end": group[-1].metadata.get("char_end"),
                "offset_scope": first.metadata.get("offset_scope"),
                "offset_scope_id": first.metadata.get("offset_scope_id"),
                "offset_coordinate_system": first.metadata.get("offset_coordinate_system"),
                "source_spans": list(source_spans.values()),
                "structural_parent_id": first.metadata.get("structural_parent_id"),
                "page_numbers": list(
                    dict.fromkeys(
                        child.metadata.get("page_number")
                        for child in group
                        if child.metadata.get("page_number") is not None
                    )
                ),
            },
        )
        parents.append(parent)
        for child in group:
            child.id = child.id or str(uuid4())
            child.parent_chunk_id = parent_id
            child.metadata = {
                **child.metadata,
                "chunk_role": "child",
                "parent_chunk_id": parent_id,
            }
            child.metadata.pop("_table_parent_content", None)
            out.append(child)

    # Parents first so FK-like references resolve when loading by id.
    return parents + out


def _merge_non_overlapping_chunks(group: list[DocumentChunk]) -> str:
    """Build a parent from canonical text, removing repeated child overlap."""
    merged = [group[0].content]
    end = group[0].metadata["char_end"]
    for child in group[1:]:
        start = child.metadata["char_start"]
        suffix = child.content[max(0, end - start) :]
        if suffix:
            merged.append(suffix if start <= end else "\n\n" + suffix)
        end = max(end, child.metadata["char_end"])
    return "".join(merged)


class ChunkingService:
    def __init__(self, config: RagConfig | None = None):
        self.config = config or RagConfig.from_settings()

    async def chunk(  # noqa: PLR0913 - document identity and tenant scope travel together
        self,
        documents: list[ParsedDocument],
        *,
        document_id: str,
        user_id: str,
        filename: str,
        project_id: str | None = None,
        organization_id: str | None = None,
        document_revision: str | None = None,
    ) -> list[DocumentChunk]:
        return await asyncio.to_thread(
            self.chunk_sync,
            documents,
            document_id=document_id,
            user_id=user_id,
            filename=filename,
            project_id=project_id,
            organization_id=organization_id,
            document_revision=document_revision,
        )

    def chunk_sync(  # noqa: PLR0913 - document identity and tenant scope travel together
        self,
        documents: list[ParsedDocument],
        *,
        document_id: str,
        user_id: str,
        filename: str,
        project_id: str | None = None,
        organization_id: str | None = None,
        document_revision: str | None = None,
    ) -> list[DocumentChunk]:
        pieces = _split_documents_with_token_counts(
            documents,
            config=self.config,
            document_revision=document_revision,
            max_chunks=self.config.max_ingestion_chunks,
            max_tokens=self.config.max_ingestion_tokens,
        )
        chunks: list[DocumentChunk] = []
        for index, (content, token_count, meta) in enumerate(pieces):
            content_hash = meta.get("content_hash")
            chunks.append(
                DocumentChunk(
                    id=str(uuid4()),
                    document_id=document_id,
                    user_id=user_id,
                    chunk_index=index,
                    content=content,
                    token_count=token_count,
                    organization_id=organization_id,
                    project_id=project_id,
                    content_hash=content_hash if isinstance(content_hash, str) else None,
                    metadata={
                        **meta,
                        "document_id": document_id,
                        "user_id": user_id,
                        "organization_id": organization_id,
                        "project_id": project_id,
                        "filename": filename,
                        "chunk_index": index,
                        "parser_version": meta.get("parser_version")
                        or getattr(self.config, "parser_version", None),
                        "chunker_version": CHUNKER_VERSION,
                        "embedding_provider": getattr(self.config, "embedding_provider", None),
                        "embedding_model": getattr(self.config, "embedding_model", None),
                        "embedding_dimensions": getattr(self.config, "embedding_dimensions", None),
                        "source_type": "upload",
                    },
                )
            )
        if getattr(self.config, "parent_context_enabled", False):
            _, count, _ = resolve_token_counter(
                getattr(self.config, "embedding_provider", ""),
                getattr(self.config, "embedding_model", ""),
            )
            chunks = _attach_parent_windows(
                chunks, window=getattr(self.config, "parent_window_size", 3), count=count
            )
            if len(chunks) > self.config.max_ingestion_chunks:
                raise ValueError("Document exceeds the chunk limit")
            if sum(chunk.token_count for chunk in chunks) > self.config.max_ingestion_tokens:
                raise ValueError("Document exceeds the token limit")
        return chunks
