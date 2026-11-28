from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from backend.core.schemas import RequestModel
from backend.modules.rag.enums import RetrievalIntent
from backend.modules.rag.metadata_filters import RetrievalMetadataFilter


class RagDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    project_id: str | None
    organization_id: str | None
    filename: str
    original_filename: str
    content_type: str
    storage_path: str | None
    status: str
    source_type: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
    current_revision_id: str | None = None


class RagDocumentUploadResponse(BaseModel):
    document: RagDocumentResponse
    ingestion_job: RagIngestionJobResponse


class RagChunkResponse(BaseModel):
    id: str
    document_id: str
    chunk_index: int
    content: str
    token_count: int
    metadata: dict[str, Any] = Field(default_factory=dict)
    revision_id: str | None = None


class RagIngestionJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: str
    user_id: str
    project_id: str | None
    status: str
    error_message: str | None
    started_at: datetime | None
    finished_at: datetime | None
    progress_percent: int = 0
    retry_count: int = 0
    max_retries: int = 3
    idempotency_key: str | None = None
    parser_version: str | None = None
    malware_scan_status: str = "pending"
    last_heartbeat_at: datetime | None = None
    error_code: str | None = None
    created_at: datetime


class RagRetrieveRequest(RequestModel):
    query: str = Field(min_length=1, max_length=4000)
    project_id: str | None = None
    # None = unscoped (generic /rag); [] = empty allow-list (I1); [...] = filter
    document_ids: list[str] | None = None
    top_k: int | None = Field(default=None, ge=1, le=20)
    intent: RetrievalIntent | None = None
    retrieval_mode: Literal["hybrid", "dense", "lexical"] = "hybrid"
    metadata_filter: RetrievalMetadataFilter | None = None


class RagRetrievalDraft(RequestModel):
    min_cosine: float | None = Field(default=None, ge=-1, le=1)
    candidate_pool: int | None = Field(default=None, ge=1, le=256, strict=True)
    rrf_k: int | None = Field(default=None, ge=1, le=256, strict=True)
    reranker: Literal["configured", "none", "heuristic"] = "configured"


class RagCompareRequest(RagRetrieveRequest):
    document_ids: list[str] | None = Field(default=None, max_length=100)
    draft: RagRetrievalDraft
    baseline_mode: Literal["hybrid", "dense", "lexical"] = "hybrid"


class RagRetrievedChunkResponse(BaseModel):
    chunk_id: str
    document_id: str
    content: str
    score: float
    filename: str
    chunk_index: int
    page_number: int | None = None
    rank: int | None = None
    used_in_answer: bool = False
    index_revision_id: str | None = None
    source_span_ids: list[str] | None = None
    char_start: int | None = None
    char_end: int | None = None
    offset_coordinate_system: str | None = None
    offset_scope: str | None = None
    offset_scope_id: str | None = None
    source_spans: list[dict] | None = None
    retrieval_sources: list[str] = Field(default_factory=list)


class RagCoverageResponse(BaseModel):
    documents_in_scope: int = 0
    documents_with_retrieved_evidence: int = 0
    retrieved_passage_count: int = 0
    coverage_ratio: float = 0.0


class RagRetrievalDiagnostics(BaseModel):
    score_kind: Literal["rrf", "cosine", "lexical_rank", "none"]
    cache: Literal["hit", "miss", "bypassed"]
    dense_candidates: int = 0
    lexical_candidates: int = 0
    fused_candidates: int = 0
    min_cosine: float | None = None
    rrf_k: int | None = None
    rerank_window: int = 0
    dense_pool: int = 0
    lexical_pool: int = 0
    stage_timings_ms: dict[str, int] = Field(default_factory=dict)
    branch_status: dict[str, str] = Field(default_factory=dict)


class RagRetrieveResponse(BaseModel):
    chunks: list[RagRetrievedChunkResponse]
    degraded: bool = False
    degradation_reason: str | None = None
    no_matches: bool = False
    injection_chunks_filtered: int = 0
    intent: str | None = None
    fusion_method: str | None = None
    reranker: str | None = None
    reranking_status: Literal["skipped", "applied", "fallback"] | None = None
    coverage: RagCoverageResponse | None = None
    retrieval_trace_id: str | None = None
    index_revision_ids: list[str] = Field(default_factory=list)
    diagnostics: RagRetrievalDiagnostics | None = None


class RagCompareResponse(BaseModel):
    baseline: RagRetrieveResponse
    candidate: RagRetrieveResponse
    document_count: int
    index_revision_ids: list[str]


class RagAskRequest(RequestModel):
    query: str = Field(min_length=1, max_length=4000)
    project_id: str | None = None
    run_id: str | None = None
    agent_id: str | None = None
    document_ids: list[str] | None = None
    intent: str | None = None


class RagCitationResponse(BaseModel):
    document_id: str
    chunk_id: str
    filename: str
    score: float
    snippet: str
    page_number: int | None = None
    chunk_index: int | None = None
    citation_number: int | None = None
    used_in_answer: bool = False
    section_heading: str | None = None
    char_start: int | None = None
    char_end: int | None = None
    source_span_ids: list[str] | None = None
    parent_context_id: str | None = None
    offset_coordinate_system: str | None = None
    offset_scope: str | None = None
    offset_scope_id: str | None = None
    source_spans: list[dict] | None = None
    index_revision_id: str | None = None


class RagClaimResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    text: str
    chunk_ids: list[str]
    citation_numbers: list[int]


class RagSourcePreviewResponse(BaseModel):
    document_id: str
    chunk_id: str
    revision_id: str | None
    content: str
    page_number: int | None = None
    section_heading: str | None = None
    sheet_id: str | None = None
    table_row_start: int | None = None
    table_row_end: int | None = None
    source_spans: list[dict] | None = None
    original_pdf_url: str | None = None


class RagAskResponse(BaseModel):
    query: str
    answer: str
    citations: list[RagCitationResponse]
    retrieved_chunk_ids: list[str]
    model_name: str
    latency_ms: int
    no_context_found: bool
    ai_run_id: str | None = None
    retrieval_degraded: bool = False
    memory_degraded: bool = False
    degradation_reason: str | None = None
    injection_chunks_filtered: int = 0
    retrieval_trace_id: str | None = None
    evidence_revision_hash: str | None = None
    citation_validation_failed: bool = False
    citation_validation_status: str = "no_evidence"
    claims: list[RagClaimResponse] = Field(default_factory=list)
    coverage: RagCoverageResponse | None = None
    index_revision_ids: list[str] = Field(default_factory=list)


class RagQueryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    query: str
    answer: str
    project_id: str | None
    model_name: str
    latency_ms: int
    created_at: datetime
