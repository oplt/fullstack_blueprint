from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from backend.core.db.base import Base


class AiPromptTemplate(Base):
    __tablename__ = "ai_prompt_templates"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    key: Mapped[str] = mapped_column(String(128), index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    active_version_id: Mapped[str | None] = mapped_column(
        ForeignKey(
            "ai_prompt_versions.id",
            ondelete="SET NULL",
            use_alter=True,
            name="fk_template_active_version",
        ),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )


class AiPromptVersion(Base):
    __tablename__ = "ai_prompt_versions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    prompt_template_id: Mapped[str] = mapped_column(
        ForeignKey("ai_prompt_templates.id", ondelete="CASCADE"),
        index=True,
    )
    version_number: Mapped[int] = mapped_column(Integer)
    provider_key: Mapped[str] = mapped_column(String(64), default="local")
    model_name: Mapped[str] = mapped_column(String(128))
    system_prompt: Mapped[str] = mapped_column(Text, default="")
    user_prompt_template: Mapped[str] = mapped_column(Text)
    variable_definitions_json: Mapped[list[dict]] = mapped_column(JSON, default=list)
    response_format: Mapped[str] = mapped_column(String(32), default="text")
    temperature: Mapped[float] = mapped_column(Float, default=0.2)
    rollout_percentage: Mapped[int] = mapped_column(Integer, default=100)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    input_cost_per_million: Mapped[int] = mapped_column(Integer, default=0)
    output_cost_per_million: Mapped[int] = mapped_column(Integer, default=0)
    created_by_user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )


class AiRun(Base):
    __tablename__ = "ai_runs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    prompt_template_id: Mapped[str | None] = mapped_column(
        ForeignKey("ai_prompt_templates.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    prompt_version_id: Mapped[str | None] = mapped_column(
        ForeignKey("ai_prompt_versions.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    evaluation_dataset_id: Mapped[str | None] = mapped_column(
        ForeignKey("ai_evaluation_datasets.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    evaluation_case_id: Mapped[str | None] = mapped_column(
        ForeignKey("ai_evaluation_cases.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    agent_id: Mapped[str | None] = mapped_column(String(128), index=True, nullable=True)
    agent_run_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    provider_key: Mapped[str] = mapped_column(String(64))
    model_name: Mapped[str] = mapped_column(String(128))
    status: Mapped[str] = mapped_column(String(32), default="completed")
    response_format: Mapped[str] = mapped_column(String(32), default="text")
    variables_json: Mapped[dict] = mapped_column(JSON, default=dict)
    retrieval_query: Mapped[str | None] = mapped_column(Text, nullable=True)
    retrieved_chunk_ids_json: Mapped[list[str]] = mapped_column(JSON, default=list)
    retrieval_degraded: Mapped[bool] = mapped_column(Boolean, default=False)
    memory_degraded: Mapped[bool] = mapped_column(Boolean, default=False)
    degradation_reason: Mapped[str | None] = mapped_column(String(128), nullable=True)
    injection_chunks_filtered: Mapped[int] = mapped_column(Integer, default=0)
    input_messages_json: Mapped[list[dict]] = mapped_column(JSON, default=list)
    output_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    output_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0)
    estimated_cost_micros: Mapped[int] = mapped_column(Integer, default=0)
    tenant_id: Mapped[str | None] = mapped_column(String(128), index=True, nullable=True)
    provider_request_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    routing_policy_json: Mapped[dict] = mapped_column(JSON, default=dict)
    data_region: Mapped[str | None] = mapped_column(String(64), nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    input_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    review_status: Mapped[str] = mapped_column(String(32), default="not_requested")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AiConversation(Base):
    __tablename__ = "ai_conversations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    tenant_id: Mapped[str | None] = mapped_column(String(128), index=True, nullable=True)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )


class AiConversationMessage(Base):
    __tablename__ = "ai_messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    conversation_id: Mapped[str] = mapped_column(
        ForeignKey("ai_conversations.id", ondelete="CASCADE"), index=True
    )
    run_id: Mapped[str | None] = mapped_column(
        ForeignKey("ai_runs.id", ondelete="SET NULL"), index=True, nullable=True
    )
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(32))
    sequence: Mapped[int] = mapped_column(Integer)
    content_json: Mapped[list[dict] | str] = mapped_column(JSON)
    redacted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )


class AiMessagePart(Base):
    __tablename__ = "ai_message_parts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    message_id: Mapped[str] = mapped_column(
        ForeignKey("ai_messages.id", ondelete="CASCADE"), index=True
    )
    part_type: Mapped[str] = mapped_column(String(32))
    content_json: Mapped[dict] = mapped_column(JSON, default=dict)
    sequence: Mapped[int] = mapped_column(Integer)


class AiRunStep(Base):
    __tablename__ = "ai_run_steps"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    run_id: Mapped[str] = mapped_column(ForeignKey("ai_runs.id", ondelete="CASCADE"), index=True)
    sequence: Mapped[int] = mapped_column(Integer)
    step_type: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(32), default="completed")
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AiToolCallRecord(Base):
    __tablename__ = "ai_tool_calls"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    run_id: Mapped[str] = mapped_column(ForeignKey("ai_runs.id", ondelete="CASCADE"), index=True)
    step_id: Mapped[str | None] = mapped_column(
        ForeignKey("ai_run_steps.id", ondelete="SET NULL"), index=True, nullable=True
    )
    provider_call_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tool_name: Mapped[str] = mapped_column(String(128))
    arguments_json: Mapped[dict] = mapped_column(JSON, default=dict)
    result_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    idempotency_key: Mapped[str] = mapped_column(String(255), unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AiArtifact(Base):
    __tablename__ = "ai_artifacts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    run_id: Mapped[str] = mapped_column(ForeignKey("ai_runs.id", ondelete="CASCADE"), index=True)
    artifact_type: Mapped[str] = mapped_column(String(64))
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    uri: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )


class AiUsageRecord(Base):
    __tablename__ = "ai_usage_records"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    run_id: Mapped[str] = mapped_column(ForeignKey("ai_runs.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    tenant_id: Mapped[str | None] = mapped_column(String(128), index=True, nullable=True)
    provider_key: Mapped[str] = mapped_column(String(64))
    model_name: Mapped[str] = mapped_column(String(128))
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    cost_micros: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )


class AiAgentDefinition(Base):
    __tablename__ = "ai_agent_definitions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    tenant_id: Mapped[str | None] = mapped_column(String(128), index=True, nullable=True)
    key: Mapped[str] = mapped_column(String(128), index=True)
    name: Mapped[str] = mapped_column(String(255))
    version: Mapped[int] = mapped_column(Integer, default=1)
    instructions: Mapped[str] = mapped_column(Text, default="")
    provider_key: Mapped[str] = mapped_column(String(64), default="local")
    model_name: Mapped[str] = mapped_column(String(128))
    tool_ids_json: Mapped[list[str]] = mapped_column(JSON, default=list)
    configuration_json: Mapped[dict] = mapped_column(JSON, default=dict)
    max_steps: Mapped[int] = mapped_column(Integer, default=8)
    max_tool_calls: Mapped[int] = mapped_column(Integer, default=8)
    max_tokens: Mapped[int] = mapped_column(Integer, default=16_000)
    max_cost_micros: Mapped[int | None] = mapped_column(Integer, nullable=True)
    timeout_seconds: Mapped[float] = mapped_column(Float, default=60.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )


class AiWorkflowRun(Base):
    __tablename__ = "ai_workflow_runs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    tenant_id: Mapped[str] = mapped_column(String(128), index=True)
    agent_definition_id: Mapped[str] = mapped_column(
        ForeignKey("ai_agent_definitions.id", ondelete="RESTRICT"), index=True
    )
    status: Mapped[str] = mapped_column(String(32), default="pending", index=True)
    current_step: Mapped[int] = mapped_column(Integer, default=0)
    state_json: Mapped[dict] = mapped_column(JSON, default=dict)
    checkpoint_json: Mapped[dict] = mapped_column(JSON, default=dict)
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    estimated_cost_micros: Mapped[int] = mapped_column(Integer, default=0)
    cancellation_requested: Mapped[bool] = mapped_column(Boolean, default=False)
    resume_token: Mapped[str | None] = mapped_column(String(128), nullable=True)
    idempotency_key: Mapped[str] = mapped_column(String(255), unique=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AiWorkflowCheckpoint(Base):
    __tablename__ = "ai_workflow_checkpoints"
    __table_args__ = (
        UniqueConstraint(
            "workflow_run_id",
            "sequence",
            name="uq_ai_workflow_checkpoint_sequence",
        ),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    workflow_run_id: Mapped[str] = mapped_column(
        ForeignKey("ai_workflow_runs.id", ondelete="CASCADE"), index=True
    )
    sequence: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(32))
    state_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )


class AiToolApproval(Base):
    __tablename__ = "ai_tool_approvals"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    workflow_run_id: Mapped[str] = mapped_column(
        ForeignKey("ai_workflow_runs.id", ondelete="CASCADE"), index=True
    )
    tool_identifier: Mapped[str] = mapped_column(String(160))
    tool_version: Mapped[int] = mapped_column(Integer)
    parameters_hash: Mapped[str] = mapped_column(String(64))
    tenant_id: Mapped[str] = mapped_column(String(128), index=True)
    execution_context_hash: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(32), default="pending", index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    approved_by_user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AiToolExecution(Base):
    __tablename__ = "ai_tool_executions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    workflow_run_id: Mapped[str] = mapped_column(
        ForeignKey("ai_workflow_runs.id", ondelete="CASCADE"), index=True
    )
    tool_identifier: Mapped[str] = mapped_column(String(160))
    tool_version: Mapped[int] = mapped_column(Integer)
    input_hash: Mapped[str] = mapped_column(String(64))
    idempotency_key: Mapped[str] = mapped_column(String(255), unique=True)
    side_effect: Mapped[str] = mapped_column(String(40))
    approval_id: Mapped[str | None] = mapped_column(
        ForeignKey("ai_tool_approvals.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(32), default="running", index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    input_json: Mapped[dict] = mapped_column(JSON, default=dict)
    output_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AiMcpServer(Base):
    __tablename__ = "ai_mcp_servers"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )
    tenant_id: Mapped[str | None] = mapped_column(String(128), index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(160), unique=True)
    transport: Mapped[str] = mapped_column(String(32), default="streamable_http")
    endpoint: Mapped[str] = mapped_column(Text)
    credential_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tool_allowlist_json: Mapped[list[str]] = mapped_column(JSON, default=list)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )


class AiReviewItem(Base):
    __tablename__ = "ai_review_items"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    run_id: Mapped[str] = mapped_column(
        ForeignKey("ai_runs.id", ondelete="CASCADE"),
        index=True,
    )
    requested_by_user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    assigned_to_user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    reviewed_by_user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    status: Mapped[str] = mapped_column(String(32), default="pending")
    reviewer_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    corrected_output: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )


class AiFeedback(Base):
    __tablename__ = "ai_feedback"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    run_id: Mapped[str] = mapped_column(
        ForeignKey("ai_runs.id", ondelete="CASCADE"),
        index=True,
    )
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    rating: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    corrected_output: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )


class AiEvaluationDataset(Base):
    __tablename__ = "ai_evaluation_datasets"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )


class AiEvaluationCase(Base):
    __tablename__ = "ai_evaluation_cases"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    dataset_id: Mapped[str] = mapped_column(
        ForeignKey("ai_evaluation_datasets.id", ondelete="CASCADE"),
        index=True,
    )
    input_variables_json: Mapped[dict] = mapped_column(JSON, default=dict)
    retrieval_query: Mapped[str | None] = mapped_column(Text, nullable=True)
    document_ids_json: Mapped[list[str]] = mapped_column(JSON, default=list)
    expected_chunk_ids_json: Mapped[list[str]] = mapped_column(JSON, default=list)
    expected_output_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    expected_output_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )


class AiEvaluationRun(Base):
    __tablename__ = "ai_evaluation_runs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    dataset_id: Mapped[str] = mapped_column(
        ForeignKey("ai_evaluation_datasets.id", ondelete="CASCADE"),
        index=True,
    )
    prompt_version_id: Mapped[str] = mapped_column(
        ForeignKey("ai_prompt_versions.id", ondelete="CASCADE"),
        index=True,
    )
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(32), default="completed")
    total_cases: Mapped[int] = mapped_column(Integer, default=0)
    passed_cases: Mapped[int] = mapped_column(Integer, default=0)
    average_score: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AiEvaluationRunItem(Base):
    __tablename__ = "ai_evaluation_run_items"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    evaluation_run_id: Mapped[str] = mapped_column(
        ForeignKey("ai_evaluation_runs.id", ondelete="CASCADE"),
        index=True,
    )
    evaluation_case_id: Mapped[str] = mapped_column(
        ForeignKey("ai_evaluation_cases.id", ondelete="CASCADE"),
        index=True,
    )
    ai_run_id: Mapped[str] = mapped_column(
        ForeignKey("ai_runs.id", ondelete="CASCADE"),
        index=True,
    )
    score: Mapped[float] = mapped_column(Float, default=0.0)
    passed: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
