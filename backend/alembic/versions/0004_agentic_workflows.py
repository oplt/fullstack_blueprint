"""Agent definitions, tool approvals/executions, MCP registry, and checkpoints."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0004_agentic_workflows"
down_revision: str | Sequence[str] | None = "0003_ai_infrastructure"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "ai_agent_definitions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("tenant_id", sa.String(length=128), nullable=True),
        sa.Column("key", sa.String(length=128), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("instructions", sa.Text(), nullable=False),
        sa.Column("provider_key", sa.String(length=64), nullable=False),
        sa.Column("model_name", sa.String(length=128), nullable=False),
        sa.Column("tool_ids_json", sa.JSON(), nullable=False),
        sa.Column("configuration_json", sa.JSON(), nullable=False),
        sa.Column("max_steps", sa.Integer(), nullable=False),
        sa.Column("max_tool_calls", sa.Integer(), nullable=False),
        sa.Column("max_tokens", sa.Integer(), nullable=False),
        sa.Column("max_cost_micros", sa.Integer(), nullable=True),
        sa.Column("timeout_seconds", sa.Float(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ai_agent_definitions_user_id"), "ai_agent_definitions", ["user_id"])
    op.create_index(
        op.f("ix_ai_agent_definitions_tenant_id"), "ai_agent_definitions", ["tenant_id"]
    )
    op.create_index(op.f("ix_ai_agent_definitions_key"), "ai_agent_definitions", ["key"])

    op.create_table(
        "ai_workflow_runs",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("tenant_id", sa.String(length=128), nullable=False),
        sa.Column("agent_definition_id", sa.String(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("current_step", sa.Integer(), nullable=False),
        sa.Column("state_json", sa.JSON(), nullable=False),
        sa.Column("checkpoint_json", sa.JSON(), nullable=False),
        sa.Column("input_tokens", sa.Integer(), nullable=False),
        sa.Column("output_tokens", sa.Integer(), nullable=False),
        sa.Column("estimated_cost_micros", sa.Integer(), nullable=False),
        sa.Column("cancellation_requested", sa.Boolean(), nullable=False),
        sa.Column("resume_token", sa.String(length=128), nullable=True),
        sa.Column("idempotency_key", sa.String(length=255), nullable=False),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["agent_definition_id"], ["ai_agent_definitions.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("idempotency_key"),
    )
    op.create_index(op.f("ix_ai_workflow_runs_user_id"), "ai_workflow_runs", ["user_id"])
    op.create_index(op.f("ix_ai_workflow_runs_tenant_id"), "ai_workflow_runs", ["tenant_id"])
    op.create_index(
        op.f("ix_ai_workflow_runs_agent_definition_id"), "ai_workflow_runs", ["agent_definition_id"]
    )
    op.create_index(op.f("ix_ai_workflow_runs_status"), "ai_workflow_runs", ["status"])

    op.create_table(
        "ai_workflow_checkpoints",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("workflow_run_id", sa.String(), nullable=False),
        sa.Column("sequence", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("state_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["workflow_run_id"], ["ai_workflow_runs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "workflow_run_id", "sequence", name="uq_ai_workflow_checkpoint_sequence"
        ),
    )
    op.create_index(
        op.f("ix_ai_workflow_checkpoints_workflow_run_id"),
        "ai_workflow_checkpoints",
        ["workflow_run_id"],
    )

    op.create_table(
        "ai_tool_approvals",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("workflow_run_id", sa.String(), nullable=False),
        sa.Column("tool_identifier", sa.String(length=160), nullable=False),
        sa.Column("tool_version", sa.Integer(), nullable=False),
        sa.Column("parameters_hash", sa.String(length=64), nullable=False),
        sa.Column("tenant_id", sa.String(length=128), nullable=False),
        sa.Column("execution_context_hash", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("approved_by_user_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["approved_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["workflow_run_id"], ["ai_workflow_runs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_ai_tool_approvals_workflow_run_id"), "ai_tool_approvals", ["workflow_run_id"]
    )
    op.create_index(op.f("ix_ai_tool_approvals_tenant_id"), "ai_tool_approvals", ["tenant_id"])
    op.create_index(op.f("ix_ai_tool_approvals_status"), "ai_tool_approvals", ["status"])

    op.create_table(
        "ai_tool_executions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("workflow_run_id", sa.String(), nullable=False),
        sa.Column("tool_identifier", sa.String(length=160), nullable=False),
        sa.Column("tool_version", sa.Integer(), nullable=False),
        sa.Column("input_hash", sa.String(length=64), nullable=False),
        sa.Column("idempotency_key", sa.String(length=255), nullable=False),
        sa.Column("side_effect", sa.String(length=40), nullable=False),
        sa.Column("approval_id", sa.String(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("input_json", sa.JSON(), nullable=False),
        sa.Column("output_json", sa.JSON(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["approval_id"], ["ai_tool_approvals.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["workflow_run_id"], ["ai_workflow_runs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("idempotency_key"),
    )
    op.create_index(
        op.f("ix_ai_tool_executions_workflow_run_id"), "ai_tool_executions", ["workflow_run_id"]
    )
    op.create_index(op.f("ix_ai_tool_executions_status"), "ai_tool_executions", ["status"])

    op.create_table(
        "ai_mcp_servers",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=True),
        sa.Column("tenant_id", sa.String(length=128), nullable=True),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("transport", sa.String(length=32), nullable=False),
        sa.Column("endpoint", sa.Text(), nullable=False),
        sa.Column("credential_ref", sa.String(length=255), nullable=True),
        sa.Column("tool_allowlist_json", sa.JSON(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index(op.f("ix_ai_mcp_servers_user_id"), "ai_mcp_servers", ["user_id"])
    op.create_index(op.f("ix_ai_mcp_servers_tenant_id"), "ai_mcp_servers", ["tenant_id"])


def downgrade() -> None:
    raise RuntimeError("Agent workflow history must be retained; use a forward migration.")
