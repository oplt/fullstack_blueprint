from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from typing import Any

from backend.modules.rag.filters import RetrievalMetadataFilter


class DocumentStatus(StrEnum):
    UPLOADED = "uploaded"
    INDEXED = "indexed"
    FAILED = "failed"
    DELETED = "deleted"

    # Legacy values: retain for existing records/API consumers during migration.
    # New ingestion attempts track processing progress on the job instead.
    PARSING = "parsing"
    CHUNKING = "chunking"
    EMBEDDING = "embedding"


class IngestionJobStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    RETRYING = "retrying"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class IngestionStage(StrEnum):
    DOWNLOAD = "download"
    SCAN = "scan"
    PARSE = "parse"
    CHUNK = "chunk"
    EMBED = "embed"
    PERSIST = "persist"


class IngestionErrorCode(StrEnum):
    INDEXING_FAILED = "INDEXING_FAILED"
    DOCUMENT_INVALID = "DOCUMENT_INVALID"
    STORAGE_UNAVAILABLE = "STORAGE_UNAVAILABLE"
    SCAN_UNAVAILABLE = "SCAN_UNAVAILABLE"
    EMBEDDING_FAILED = "EMBEDDING_FAILED"
    EMBEDDING_INVALID = "EMBEDDING_INVALID"
    DATABASE_UNAVAILABLE = "DATABASE_UNAVAILABLE"
    DOCUMENT_DELETED = "DOCUMENT_DELETED"
    WORKER_LEASE_LOST = "WORKER_LEASE_LOST"
    WORKER_CANCELLED = "WORKER_CANCELLED"


class SourceType(StrEnum):
    UPLOAD = "upload"
    API = "api"
    MANUAL = "manual"


class RetrievalIntent(StrEnum):
    FACT = "fact"
    DEFINITION = "definition"
    EVIDENCE = "evidence"
    COMPARISON = "comparison"
    SYNTHESIS = "synthesis"
    CONTRADICTION = "contradiction"
    SEMANTIC_SEARCH = "semantic_search"


class MessageRole(StrEnum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


@dataclass(slots=True)
class ParsedBlock:
    """Normalized parser item provenance, scoped to one source revision."""

    block_id: str
    kind: str
    reading_order: int
    source_span: dict[str, Any]
    document_id: str | None = None
    revision_id: str | None = None
    source_document_hash: str | None = None
    page_start: int | None = None
    page_end: int | None = None
    bbox: tuple[float, float, float, float] | None = None
    bbox_coordinate_system: str | None = None
    section_path: tuple[str, ...] = ()
    language: str | None = None
    parser_name: str = "unknown"
    parser_version: str = "unknown"
    ocr_confidence: float | None = None
    table_headers: tuple[str, ...] = ()
    table_rows: tuple[tuple[str, ...], ...] = ()
    table_cells: tuple[dict[str, Any], ...] = ()
    media_reference: str | None = None

    def to_dict(self, *, include_table_data: bool = True) -> dict[str, Any]:
        return {
            "block_id": self.block_id,
            "kind": self.kind,
            "reading_order": self.reading_order,
            "source_span": dict(self.source_span),
            "document_id": self.document_id,
            "revision_id": self.revision_id,
            "source_document_hash": self.source_document_hash,
            "page_start": self.page_start,
            "page_end": self.page_end,
            "bbox": list(self.bbox) if self.bbox else None,
            "bbox_coordinate_system": self.bbox_coordinate_system,
            "section_path": list(self.section_path),
            "language": self.language,
            "parser_name": self.parser_name,
            "parser_version": self.parser_version,
            "ocr_confidence": self.ocr_confidence,
            "table_headers": list(self.table_headers),
            **(
                {
                    "table_rows": [list(row) for row in self.table_rows],
                    "table_cells": [dict(cell) for cell in self.table_cells],
                }
                if include_table_data
                else {}
            ),
            "media_reference": self.media_reference,
        }


@dataclass(slots=True)
class ParsedDocument:
    content: str
    metadata: dict[str, Any] = field(default_factory=dict)
    page_number: int | None = None
    source_blocks: list[ParsedBlock] = field(default_factory=list)


@dataclass(slots=True)
class DocumentChunk:
    document_id: str
    user_id: str
    chunk_index: int
    content: str
    token_count: int
    metadata: dict[str, Any] = field(default_factory=dict)
    organization_id: str | None = None
    project_id: str | None = None
    embedding: list[float] | None = None
    id: str | None = None
    vector_external_id: str | None = None
    parent_chunk_id: str | None = None
    content_hash: str | None = None


@dataclass(slots=True)
class RetrievedChunk:
    chunk_id: str
    document_id: str
    content: str
    score: float
    filename: str
    chunk_index: int
    page_number: int | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    rank: int | None = None
    used_in_answer: bool = False
    retrieval_sources: tuple[str, ...] = ()
    # ``content`` remains the exact retrieved evidence. Parent expansion may
    # add generation-only context without changing citation provenance.
    citation_content: str | None = None
    citation_chunk_id: str | None = None
    context_content: str | None = None
    parent_context_id: str | None = None
    index_revision_id: str | None = None


@dataclass(slots=True)
class RetrievalCoverage:
    documents_in_scope: int = 0
    documents_with_retrieved_evidence: int = 0
    retrieved_passage_count: int = 0
    coverage_ratio: float = 0.0


@dataclass(slots=True)
class RetrievalOutcome:
    chunks: list[RetrievedChunk]
    degraded: bool = False
    degradation_reason: str | None = None
    no_matches: bool = False
    injection_chunks_filtered: int = 0
    intent: RetrievalIntent | None = None
    fusion_method: str | None = None
    coverage: RetrievalCoverage | None = None
    dense_candidate_count: int = 0
    lexical_candidate_count: int = 0
    fused_candidate_count: int = 0
    retrieval_trace_id: str | None = None
    scope_hash: str | None = None
    evidence_revision_hash: str | None = None
    index_revision_ids: list[str] = field(default_factory=list)
    cache_hit: bool = False
    request_id: str | None = None
    retrieval_provenance: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class ClaimCitation:
    text: str
    chunk_ids: list[str]
    citation_numbers: list[int] = field(default_factory=list)


@dataclass(slots=True)
class Citation:
    document_id: str
    chunk_id: str
    filename: str
    score: float
    snippet: str
    page_number: int | None = None
    chunk_index: int | None = None
    citation_number: int | None = None
    section_heading: str | None = None
    used_in_answer: bool = False
    char_start: int | None = None
    char_end: int | None = None
    source_span_ids: list[str] | None = None
    parent_context_id: str | None = None
    offset_coordinate_system: str | None = None
    offset_scope: str | None = None
    offset_scope_id: str | None = None
    source_spans: list[dict[str, Any]] | None = None
    index_revision_id: str | None = None
    source_status: str | None = None


@dataclass(slots=True)
class RagAnswer:
    query: str
    answer: str
    citations: list[Citation]
    retrieved_chunk_ids: list[str]
    model_name: str
    latency_ms: int
    no_context_found: bool = False
    ai_run_id: str | None = None
    retrieval_degraded: bool = False
    memory_degraded: bool = False
    degradation_reason: str | None = None
    injection_chunks_filtered: int = 0
    claims: list[ClaimCitation] = field(default_factory=list)
    retrieval_trace_id: str | None = None
    coverage: RetrievalCoverage | None = None
    citation_validation_failed: bool = False
    citation_validation_status: str = "valid"
    evidence_revision_hash: str | None = None
    prompt_template_id: str | None = None
    prompt_version_id: str | None = None
    resolved_retrieval_query: str | None = None
    context_message_ids: list[str] = field(default_factory=list)
    index_revision_ids: list[str] = field(default_factory=list)


@dataclass(slots=True)
class RagQuery:
    id: str
    user_id: str
    query: str
    answer: str
    project_id: str | None
    retrieved_chunk_ids: list[str]
    model_name: str
    latency_ms: int
    created_at: datetime


@dataclass(slots=True)
class Document:
    id: str
    user_id: str
    filename: str
    original_filename: str
    content_type: str
    storage_path: str | None
    status: DocumentStatus
    source_type: SourceType
    project_id: str | None
    organization_id: str | None
    metadata: dict[str, Any]
    created_at: datetime
    updated_at: datetime


@dataclass(slots=True)
class IngestionJob:
    id: str
    document_id: str
    user_id: str
    project_id: str | None
    status: IngestionJobStatus
    error_message: str | None
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime


@dataclass(slots=True)
class ChunkMetadata:
    document_id: str
    user_id: str
    filename: str
    chunk_index: int
    organization_id: str | None = None
    project_id: str | None = None
    page_number: int | None = None
    source_type: str = "upload"

    def to_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "document_id": self.document_id,
            "user_id": self.user_id,
            "filename": self.filename,
            "chunk_index": self.chunk_index,
            "source_type": self.source_type,
        }
        if self.organization_id:
            payload["organization_id"] = self.organization_id
        if self.project_id:
            payload["project_id"] = self.project_id
        if self.page_number is not None:
            payload["page_number"] = self.page_number
        return payload


@dataclass(frozen=True, slots=True)
class RetrievalRequest:
    query: str
    user_id: str
    project_id: str | None
    top_k: int | None = None
    filters: Mapping[str, Any] | None = None
    intent: RetrievalIntent | str | None = None
    conversation_id: str | None = None
    persist_trace: bool = False
    evidence_revision_hash: str | None = None
    metadata: RetrievalMetadataFilter | None = None
    preview: bool = False
