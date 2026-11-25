"""Add the transactional outbox for durable cross-module events.

Revision ID: 0002_outbox
Revises: 0001_blueprint
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002_outbox"
down_revision: str | Sequence[str] | None = "0001_blueprint"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "outbox_events",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("event_id", sa.String(length=64), nullable=False),
        sa.Column("event_type", sa.String(length=160), nullable=False),
        sa.Column("event_version", sa.Integer(), nullable=False),
        sa.Column("aggregate_type", sa.String(length=80), nullable=False),
        sa.Column("aggregate_id", sa.String(length=160), nullable=False),
        sa.Column("producer", sa.String(length=120), nullable=False),
        sa.Column("payload_json", sa.JSON(), nullable=False),
        sa.Column("dedupe_key", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("available_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_id"),
        sa.UniqueConstraint("dedupe_key"),
    )
    op.create_index("ix_outbox_events_event_id", "outbox_events", ["event_id"], unique=True)
    op.create_index("ix_outbox_events_event_type", "outbox_events", ["event_type"], unique=False)
    op.create_index(
        "ix_outbox_events_aggregate_type",
        "outbox_events",
        ["aggregate_type"],
        unique=False,
    )
    op.create_index(
        "ix_outbox_events_aggregate_id",
        "outbox_events",
        ["aggregate_id"],
        unique=False,
    )
    op.create_index("ix_outbox_events_status", "outbox_events", ["status"], unique=False)
    op.create_index(
        "ix_outbox_events_available_at", "outbox_events", ["available_at"], unique=False
    )
    op.create_index("ix_outbox_events_created_at", "outbox_events", ["created_at"], unique=False)
    op.create_index(
        "ix_outbox_events_ready",
        "outbox_events",
        ["status", "available_at"],
        unique=False,
    )
    op.create_index(
        "ix_outbox_events_aggregate",
        "outbox_events",
        ["aggregate_type", "aggregate_id"],
        unique=False,
    )
    op.create_table(
        "outbox_consumer_receipts",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("event_id", sa.String(length=64), nullable=False),
        sa.Column("consumer_name", sa.String(length=160), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "event_id",
            "consumer_name",
            name="uq_outbox_consumer_event",
        ),
    )
    op.create_index(
        "ix_outbox_consumer_receipts_event_id",
        "outbox_consumer_receipts",
        ["event_id"],
        unique=False,
    )
    op.create_index(
        "ix_outbox_consumer_receipts_consumer_name",
        "outbox_consumer_receipts",
        ["consumer_name"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_outbox_consumer_receipts_consumer_name",
        table_name="outbox_consumer_receipts",
    )
    op.drop_index("ix_outbox_consumer_receipts_event_id", table_name="outbox_consumer_receipts")
    op.drop_table("outbox_consumer_receipts")
    op.drop_index("ix_outbox_events_aggregate", table_name="outbox_events")
    op.drop_index("ix_outbox_events_ready", table_name="outbox_events")
    op.drop_index("ix_outbox_events_created_at", table_name="outbox_events")
    op.drop_index("ix_outbox_events_available_at", table_name="outbox_events")
    op.drop_index("ix_outbox_events_status", table_name="outbox_events")
    op.drop_index("ix_outbox_events_aggregate_id", table_name="outbox_events")
    op.drop_index("ix_outbox_events_aggregate_type", table_name="outbox_events")
    op.drop_index("ix_outbox_events_event_type", table_name="outbox_events")
    op.drop_index("ix_outbox_events_event_id", table_name="outbox_events")
    op.drop_table("outbox_events")
