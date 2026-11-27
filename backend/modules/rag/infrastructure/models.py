from datetime import UTC, datetime
from uuid import uuid4

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    JSON,
    Boolean,
    Computed,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column

from backend.db.base import Base


class RagDocumentRevision(Base):
    """Immutable metadata for one completed or in-progress document index run."""

    __tablename__ = "rag_document_revisions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    document_id: Mapped[str] = mapped_column(
        ForeignKey("rag_documents.id", ondelete="CASCADE"), index=True
    )
    source_content_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    parser_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    chunker_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    index_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    embedding_provider: Mapped[str | None] = mapped_column(String(128), nullable=True)
    embedding_model: Mapped[str | None] = mapped_column(String(255), nullable=True)
    embedding_model_version: Mapped[str | None] = mapped_column(String(128), nullable=True)
    embedding_dimensions: Mapped[int | None] = mapped_column(Integer, nullable=True)
    embedding_preprocessing_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    embedding_model_id: Mapped[str | None] = mapped_column(
        ForeignKey("rag_embedding_models.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), index=True
    )


class RagDocument(Base):
    __tablename__ = "rag_documents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    organization_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    project_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    filename: Mapped[str] = mapped_column(String(512))
    original_filename: Mapped[str] = mapped_column(String(512))
    content_type: Mapped[str] = mapped_column(String(128))
    storage_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="uploaded", index=True)
    source_type: Mapped[str] = mapped_column(String(32), default="upload")
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    current_revision_id: Mapped[str | None] = mapped_column(
        ForeignKey(
            "rag_document_revisions.id",
            name="fk_rag_documents_current_revision",
            ondelete="SET NULL",
            use_alter=True,
        ),
        nullable=True,
        index=True,
    )


class RagChunk(Base):
    __tablename__ = "rag_chunks"
    __table_args__ = (
        Index(
            "ix_rag_chunks_embedding_hnsw",
            "embedding",
            postgresql_using="hnsw",
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
        Index("ix_rag_chunks_content_tsv", "content_tsv", postgresql_using="gin"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    document_id: Mapped[str] = mapped_column(
        ForeignKey("rag_documents.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    organization_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    project_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    chunk_index: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text)
    token_count: Mapped[int] = mapped_column(Integer, default=0)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(1536), deferred=True)
    content_tsv: Mapped[str] = mapped_column(
        TSVECTOR(),
        Computed("to_tsvector('simple'::regconfig, COALESCE(content, ''::text))", persisted=True),
        deferred=True,
    )
    embedding_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    vector_external_id: Mapped[str | None] = mapped_column(String(256), nullable=True)
    content_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    parent_chunk_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    chunker_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    parser_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    revision_id: Mapped[str | None] = mapped_column(
        ForeignKey("rag_document_revisions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )


class RagEmbeddingModel(Base):
    """A versioned embedding contract; rows are never mutated in place."""

    __tablename__ = "rag_embedding_models"
    __table_args__ = (
        UniqueConstraint(
            "provider", "key", "model", "model_version", name="uq_rag_embedding_model"
        ),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    key: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    provider: Mapped[str] = mapped_column(String(128))
    model: Mapped[str] = mapped_column(String(255))
    model_version: Mapped[str] = mapped_column(String(128), default="default")
    dimensions: Mapped[int] = mapped_column(Integer)
    distance_metric: Mapped[str] = mapped_column(String(32), default="cosine")
    normalized: Mapped[bool] = mapped_column(Boolean, default=False)
    chunking_config_json: Mapped[dict] = mapped_column(JSON, default=dict)
    index_version: Mapped[str] = mapped_column(String(128))
    cost_per_million_tokens_micros: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(32), default="registered", index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )


class RagIndexVersion(Base):
    """Lifecycle state for a non-destructive vector index generation."""

    __tablename__ = "rag_index_versions"
    __table_args__ = (
        UniqueConstraint("key", "generation", name="uq_rag_index_version_generation"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    key: Mapped[str] = mapped_column(String(160), index=True)
    generation: Mapped[int] = mapped_column(Integer)
    embedding_model_id: Mapped[str] = mapped_column(
        ForeignKey("rag_embedding_models.id", ondelete="RESTRICT"), index=True
    )
    parent_index_id: Mapped[str | None] = mapped_column(
        ForeignKey("rag_index_versions.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(32), default="building", index=True)
    switched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rolled_back_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    document_count: Mapped[int] = mapped_column(Integer, default=0)
    vector_count: Mapped[int] = mapped_column(Integer, default=0)
    estimated_cost_micros: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )


class RagChunkEmbedding(Base):
    """Variable-dimension pgvector storage for alternate embedding models."""

    __tablename__ = "rag_chunk_embeddings"
    __table_args__ = (
        UniqueConstraint(
            "chunk_id", "embedding_model_id", "index_version_id", name="uq_rag_chunk_embedding"
        ),
        Index("ix_rag_chunk_embeddings_model_index", "embedding_model_id", "index_version_id"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    chunk_id: Mapped[str] = mapped_column(
        ForeignKey("rag_chunks.id", ondelete="CASCADE"), index=True
    )
    embedding_model_id: Mapped[str] = mapped_column(
        ForeignKey("rag_embedding_models.id", ondelete="RESTRICT"), index=True
    )
    index_version_id: Mapped[str] = mapped_column(
        ForeignKey("rag_index_versions.id", ondelete="CASCADE"), index=True
    )
    dimensions: Mapped[int] = mapped_column(Integer)
    embedding: Mapped[list[float]] = mapped_column(Vector(), deferred=True)
    content_hash: Mapped[str] = mapped_column(String(64), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )


class RagQueryRecord(Base):
    __tablename__ = "rag_queries"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    organization_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    project_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    query: Mapped[str] = mapped_column(Text)
    answer: Mapped[str] = mapped_column(Text)
    retrieved_chunk_ids_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    model_name: Mapped[str] = mapped_column(String(128))
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), index=True
    )


class RagIngestionJob(Base):
    __tablename__ = "rag_ingestion_jobs"
    __table_args__ = (
        Index(
            "uq_rag_ingestion_jobs_active_document",
            "document_id",
            unique=True,
            postgresql_where=text("status IN ('pending', 'running')"),
            sqlite_where=text("status IN ('pending', 'running')"),
        ),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    document_id: Mapped[str] = mapped_column(
        ForeignKey("rag_documents.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    project_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="pending", index=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    progress_percent: Mapped[int] = mapped_column(Integer, default=0)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    max_retries: Mapped[int] = mapped_column(Integer, default=3)
    idempotency_key: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    parser_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    malware_scan_status: Mapped[str] = mapped_column(String(32), default="pending")
    last_heartbeat_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )


class RagConversation(Base):
    __tablename__ = "rag_conversations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    project_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    organization_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    title: Mapped[str] = mapped_column(String(512), default="Untitled")
    scope_snapshot_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        index=True,
    )


class RagRetrievalTrace(Base):
    __tablename__ = "rag_retrieval_traces"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    project_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    conversation_id: Mapped[str | None] = mapped_column(
        ForeignKey("rag_conversations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    query: Mapped[str] = mapped_column(Text)
    request_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    intent: Mapped[str | None] = mapped_column(String(64), nullable=True)
    scope_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    evidence_revision_hash: Mapped[str | None] = mapped_column(
        String(64), nullable=True, index=True
    )
    index_revision_ids_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    document_ids_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    retrieved_chunks_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    coverage_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    config_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    degraded: Mapped[bool] = mapped_column(Boolean, default=False)
    degradation_reason: Mapped[str | None] = mapped_column(String(256), nullable=True)
    no_matches: Mapped[bool] = mapped_column(Boolean, default=False)
    injection_chunks_filtered: Mapped[int] = mapped_column(Integer, default=0)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    stage_timings_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    branch_status_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), index=True
    )


class RagMessage(Base):
    __tablename__ = "rag_messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    conversation_id: Mapped[str] = mapped_column(
        ForeignKey("rag_conversations.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[str] = mapped_column(String(32))
    content: Mapped[str] = mapped_column(Text)
    model_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    prompt_template_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    prompt_version_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    retrieval_trace_id: Mapped[str | None] = mapped_column(
        ForeignKey("rag_retrieval_traces.id", ondelete="SET NULL"), nullable=True, index=True
    )
    citations_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    claims_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    citation_validation_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    resolved_retrieval_query: Mapped[str | None] = mapped_column(Text, nullable=True)
    context_message_ids_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_run_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    evidence_revision_hash: Mapped[str | None] = mapped_column(
        String(64), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), index=True
    )
