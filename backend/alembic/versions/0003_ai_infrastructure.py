"""AI infrastructure modernization: conversations, steps, tools and usage."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0003_ai_infrastructure"
down_revision: str | Sequence[str] | None = "0002_outbox"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("ai_runs", sa.Column("tenant_id", sa.String(length=128), nullable=True))
    op.add_column("ai_runs", sa.Column("provider_request_id", sa.String(length=255), nullable=True))
    op.add_column(
        "ai_runs",
        sa.Column("routing_policy_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
    )
    op.add_column("ai_runs", sa.Column("data_region", sa.String(length=64), nullable=True))
    op.add_column(
        "ai_runs", sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0")
    )
    op.add_column("ai_runs", sa.Column("input_hash", sa.String(length=64), nullable=True))
    op.alter_column("ai_runs", "routing_policy_json", server_default=None)
    op.alter_column("ai_runs", "retry_count", server_default=None)
    op.create_index(op.f("ix_ai_runs_tenant_id"), "ai_runs", ["tenant_id"], unique=False)

    op.create_table(
        "ai_conversations",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("tenant_id", sa.String(length=128), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ai_conversations_user_id"), "ai_conversations", ["user_id"])
    op.create_index(op.f("ix_ai_conversations_tenant_id"), "ai_conversations", ["tenant_id"])

    op.create_table(
        "ai_messages",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("conversation_id", sa.String(), nullable=False),
        sa.Column("run_id", sa.String(), nullable=True),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("sequence", sa.Integer(), nullable=False),
        sa.Column("content_json", sa.JSON(), nullable=False),
        sa.Column("redacted", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["ai_conversations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["run_id"], ["ai_runs.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ai_messages_conversation_id"), "ai_messages", ["conversation_id"])
    op.create_index(op.f("ix_ai_messages_run_id"), "ai_messages", ["run_id"])
    op.create_index(op.f("ix_ai_messages_user_id"), "ai_messages", ["user_id"])

    op.create_table(
        "ai_message_parts",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("message_id", sa.String(), nullable=False),
        sa.Column("part_type", sa.String(length=32), nullable=False),
        sa.Column("content_json", sa.JSON(), nullable=False),
        sa.Column("sequence", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["message_id"], ["ai_messages.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ai_message_parts_message_id"), "ai_message_parts", ["message_id"])

    op.create_table(
        "ai_run_steps",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("run_id", sa.String(), nullable=False),
        sa.Column("sequence", sa.Integer(), nullable=False),
        sa.Column("step_type", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["run_id"], ["ai_runs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ai_run_steps_run_id"), "ai_run_steps", ["run_id"])

    op.create_table(
        "ai_tool_calls",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("run_id", sa.String(), nullable=False),
        sa.Column("step_id", sa.String(), nullable=True),
        sa.Column("provider_call_id", sa.String(length=255), nullable=True),
        sa.Column("tool_name", sa.String(length=128), nullable=False),
        sa.Column("arguments_json", sa.JSON(), nullable=False),
        sa.Column("result_json", sa.JSON(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("idempotency_key", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["run_id"], ["ai_runs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["step_id"], ["ai_run_steps.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("idempotency_key"),
    )
    op.create_index(op.f("ix_ai_tool_calls_run_id"), "ai_tool_calls", ["run_id"])
    op.create_index(op.f("ix_ai_tool_calls_step_id"), "ai_tool_calls", ["step_id"])

    op.create_table(
        "ai_artifacts",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("run_id", sa.String(), nullable=False),
        sa.Column("artifact_type", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("uri", sa.Text(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["run_id"], ["ai_runs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ai_artifacts_run_id"), "ai_artifacts", ["run_id"])

    op.create_table(
        "ai_usage_records",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("run_id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("tenant_id", sa.String(length=128), nullable=True),
        sa.Column("provider_key", sa.String(length=64), nullable=False),
        sa.Column("model_name", sa.String(length=128), nullable=False),
        sa.Column("input_tokens", sa.Integer(), nullable=False),
        sa.Column("output_tokens", sa.Integer(), nullable=False),
        sa.Column("cost_micros", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["run_id"], ["ai_runs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ai_usage_records_run_id"), "ai_usage_records", ["run_id"])
    op.create_index(op.f("ix_ai_usage_records_user_id"), "ai_usage_records", ["user_id"])
    op.create_index(op.f("ix_ai_usage_records_tenant_id"), "ai_usage_records", ["tenant_id"])


def downgrade() -> None:
    raise RuntimeError("AI infrastructure data must be retained; use a forward migration.")
