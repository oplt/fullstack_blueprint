"""Versioned embedding indexes and governed editable memory metadata."""

from collections.abc import Sequence

import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

from alembic import op

revision: str = "0005_advanced_rag_memory"
down_revision: str | Sequence[str] | None = "0004_agentic_workflows"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "rag_embedding_models",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("key", sa.String(length=160), nullable=False),
        sa.Column("provider", sa.String(length=128), nullable=False),
        sa.Column("model", sa.String(length=255), nullable=False),
        sa.Column("model_version", sa.String(length=128), nullable=False),
        sa.Column("dimensions", sa.Integer(), nullable=False),
        sa.Column("distance_metric", sa.String(length=32), nullable=False),
        sa.Column("normalized", sa.Boolean(), nullable=False),
        sa.Column("chunking_config_json", sa.JSON(), nullable=False),
        sa.Column("index_version", sa.String(length=128), nullable=False),
        sa.Column("cost_per_million_tokens_micros", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key"),
        sa.UniqueConstraint("provider", "model", "model_version", name="uq_rag_embedding_model"),
    )
    op.create_index(op.f("ix_rag_embedding_models_key"), "rag_embedding_models", ["key"])
    op.create_index(op.f("ix_rag_embedding_models_status"), "rag_embedding_models", ["status"])

    op.create_table(
        "rag_index_versions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("key", sa.String(length=160), nullable=False),
        sa.Column("generation", sa.Integer(), nullable=False),
        sa.Column("embedding_model_id", sa.String(), nullable=False),
        sa.Column("parent_index_id", sa.String(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("switched_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rolled_back_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("document_count", sa.Integer(), nullable=False),
        sa.Column("vector_count", sa.Integer(), nullable=False),
        sa.Column("estimated_cost_micros", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["embedding_model_id"], ["rag_embedding_models.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["parent_index_id"], ["rag_index_versions.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key", "generation", name="uq_rag_index_version_generation"),
    )
    op.create_index(op.f("ix_rag_index_versions_key"), "rag_index_versions", ["key"])
    op.create_index(
        op.f("ix_rag_index_versions_embedding_model_id"),
        "rag_index_versions",
        ["embedding_model_id"],
    )
    op.create_index(op.f("ix_rag_index_versions_status"), "rag_index_versions", ["status"])

    op.add_column(
        "rag_document_revisions",
        sa.Column("embedding_model_id", sa.String(), nullable=True),
    )
    op.create_foreign_key(
        "fk_rag_document_revisions_embedding_model",
        "rag_document_revisions",
        "rag_embedding_models",
        ["embedding_model_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        op.f("ix_rag_document_revisions_embedding_model_id"),
        "rag_document_revisions",
        ["embedding_model_id"],
    )

    op.create_table(
        "rag_chunk_embeddings",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("chunk_id", sa.String(), nullable=False),
        sa.Column("embedding_model_id", sa.String(), nullable=False),
        sa.Column("index_version_id", sa.String(), nullable=False),
        sa.Column("dimensions", sa.Integer(), nullable=False),
        sa.Column("embedding", Vector(), nullable=False),
        sa.Column("content_hash", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["chunk_id"], ["rag_chunks.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["embedding_model_id"], ["rag_embedding_models.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["index_version_id"], ["rag_index_versions.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "chunk_id", "embedding_model_id", "index_version_id", name="uq_rag_chunk_embedding"
        ),
    )
    op.create_index(op.f("ix_rag_chunk_embeddings_chunk_id"), "rag_chunk_embeddings", ["chunk_id"])
    op.create_index(
        op.f("ix_rag_chunk_embeddings_embedding_model_id"),
        "rag_chunk_embeddings",
        ["embedding_model_id"],
    )
    op.create_index(
        op.f("ix_rag_chunk_embeddings_index_version_id"),
        "rag_chunk_embeddings",
        ["index_version_id"],
    )
    op.create_index(
        "ix_rag_chunk_embeddings_model_index",
        "rag_chunk_embeddings",
        ["embedding_model_id", "index_version_id"],
    )
    op.create_index(
        op.f("ix_rag_chunk_embeddings_content_hash"),
        "rag_chunk_embeddings",
        ["content_hash"],
    )

    for name, column, default in (
        ("progress_percent", sa.Integer(), sa.text("0")),
        ("retry_count", sa.Integer(), sa.text("0")),
        ("max_retries", sa.Integer(), sa.text("3")),
        ("idempotency_key", sa.String(length=255), None),
        ("parser_version", sa.String(length=64), None),
        ("malware_scan_status", sa.String(length=32), sa.text("'pending'")),
        ("last_heartbeat_at", sa.DateTime(timezone=True), None),
        ("error_code", sa.String(length=64), None),
    ):
        op.add_column(
            "rag_ingestion_jobs",
            sa.Column(name, column, nullable=default is None, server_default=default),
        )
        if default is not None:
            op.alter_column("rag_ingestion_jobs", name, server_default=None)
    op.create_unique_constraint(
        "uq_rag_ingestion_jobs_idempotency_key", "rag_ingestion_jobs", ["idempotency_key"]
    )

    for name, column, default in (
        ("scope", sa.String(length=32), None),
        ("confidence", sa.Float(), sa.text("0")),
        ("consent_status", sa.String(length=32), sa.text("'implicit'")),
        ("retention_policy", sa.String(length=64), sa.text("'default'")),
        ("expires_at", sa.DateTime(timezone=True), None),
        ("content_hash", sa.String(length=64), None),
        ("provenance_json", sa.Text(), None),
        ("conflict_status", sa.String(length=32), sa.text("'unreviewed'")),
        ("corrected_by_external_id", sa.String(length=128), None),
    ):
        op.add_column(
            "memory_registry",
            sa.Column(name, column, nullable=default is None, server_default=default),
        )
        if default is not None:
            op.alter_column("memory_registry", name, server_default=None)
    op.create_index(op.f("ix_memory_registry_scope"), "memory_registry", ["scope"])
    op.create_index(op.f("ix_memory_registry_content_hash"), "memory_registry", ["content_hash"])


def downgrade() -> None:
    raise RuntimeError(
        "RAG indexes and memory governance metadata must be retained; use a forward migration."
    )
