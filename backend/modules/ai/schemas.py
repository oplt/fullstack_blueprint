from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from backend.core.schemas import RequestModel
from backend.modules.ai.contracts import AiToolDefinition

AI_KEY_PATTERN = r"^[a-z0-9_][a-z0-9_\-\.]{1,127}$"


class AiProviderDescriptor(BaseModel):
    key: str
    label: str
    supports_generation: bool
    supports_embeddings: bool
    capabilities: list[str] = Field(default_factory=list)
    default_model: str | None = None
    available: bool = True


class AiVariableDefinition(BaseModel):
    name: str = Field(min_length=1, max_length=64, pattern=r"^[a-zA-Z_][a-zA-Z0-9_]*$")
    description: str | None = None
    required: bool = True


class AiPromptTemplateCreate(RequestModel):
    key: str = Field(min_length=2, max_length=128, pattern=AI_KEY_PATTERN)
    name: str = Field(min_length=2, max_length=255)
    description: str | None = None


class AiPromptTemplateUpdate(RequestModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = None
    is_active: bool | None = None
    active_version_id: str | None = None


class AiPromptTemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    key: str
    name: str
    description: str | None
    is_active: bool
    active_version_id: str | None
    created_at: datetime
    updated_at: datetime


class AiPromptVersionCreate(RequestModel):
    provider_key: str = Field(min_length=2, max_length=64)
    model_name: str = Field(min_length=2, max_length=128)
    system_prompt: str = ""
    user_prompt_template: str = Field(min_length=1)
    variable_definitions: list[AiVariableDefinition] = Field(default_factory=list)
    response_format: Literal["text", "json"] = "text"
    temperature: float = Field(default=0.2, ge=0, le=2)
    rollout_percentage: int = Field(default=100, ge=0, le=100)
    is_published: bool = False
    input_cost_per_million: int = Field(default=0, ge=0)
    output_cost_per_million: int = Field(default=0, ge=0)


class AiPromptVersionUpdate(RequestModel):
    system_prompt: str | None = None
    user_prompt_template: str | None = Field(default=None, min_length=1)
    variable_definitions: list[AiVariableDefinition] | None = None
    response_format: Literal["text", "json"] | None = None
    temperature: float | None = Field(default=None, ge=0, le=2)
    rollout_percentage: int | None = Field(default=None, ge=0, le=100)
    is_published: bool | None = None
    input_cost_per_million: int | None = Field(default=None, ge=0)
    output_cost_per_million: int | None = Field(default=None, ge=0)


class AiPromptVersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    prompt_template_id: str
    version_number: int
    provider_key: str
    model_name: str
    system_prompt: str
    user_prompt_template: str
    variable_definitions: list[AiVariableDefinition]
    response_format: str
    temperature: float
    rollout_percentage: int
    is_published: bool
    input_cost_per_million: int
    output_cost_per_million: int
    created_by_user_id: str | None
    created_at: datetime


class AiDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: str | None
    filename: str | None
    content_type: str
    size_bytes: int
    ingestion_status: str
    metadata: dict[str, Any]
    chunk_count: int
    created_at: datetime
    updated_at: datetime


class AiDocumentCreate(RequestModel):
    title: str = Field(min_length=2, max_length=255)
    description: str | None = None
    content: str = Field(min_length=1)
    content_type: str = Field(default="text/plain", min_length=3, max_length=128)
    metadata: dict[str, Any] = Field(default_factory=dict)


class AiChunkMatchResponse(BaseModel):
    document_id: str
    chunk_id: str
    document_title: str
    chunk_index: int
    score: float
    content: str


class AiRetrieveRequest(RequestModel):
    query: str = Field(min_length=2)
    document_ids: list[str] = Field(default_factory=list)
    top_k: int = Field(default=5, ge=1, le=20)


class AiRunRequest(RequestModel):
    prompt_template_key: str | None = Field(default=None, min_length=2, max_length=128)
    prompt_version_id: str | None = None
    variables: dict[str, Any] = Field(default_factory=dict)
    retrieval_query: str | None = None
    document_ids: list[str] = Field(default_factory=list)
    top_k: int = Field(default=4, ge=1, le=20)
    review_required: bool = False


class AiStreamRequest(RequestModel):
    provider_key: str | None = Field(default=None, min_length=2, max_length=64)
    model: str | None = Field(default=None, min_length=2, max_length=128)
    system_prompt: str = Field(default="", max_length=32_000)
    user_prompt: str = Field(min_length=1, max_length=32_000)
    response_format: Literal["text", "json"] = "text"
    temperature: float = Field(default=0.2, ge=0, le=2)
    max_output_tokens: int | None = Field(default=None, ge=1, le=32_000)
    tools: list[AiToolDefinition] = Field(default_factory=list, max_length=32)


class AiAgentDefinitionCreate(RequestModel):
    key: str = Field(min_length=1, max_length=128, pattern=AI_KEY_PATTERN)
    name: str = Field(min_length=1, max_length=255)
    instructions: str = Field(default="", max_length=32_000)
    provider_key: str = Field(default="local", min_length=2, max_length=64)
    model_name: str = Field(min_length=2, max_length=128)
    tool_ids: list[str] = Field(default_factory=list, max_length=64)
    configuration: dict[str, Any] = Field(default_factory=dict)
    max_steps: int = Field(default=8, ge=1, le=64)
    max_tool_calls: int = Field(default=8, ge=0, le=64)
    max_tokens: int = Field(default=16_000, ge=1)
    max_cost_micros: int | None = Field(default=None, ge=0)
    timeout_seconds: float = Field(default=60.0, gt=0, le=3600)


class AiAgentDefinitionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    key: str
    name: str
    version: int
    instructions: str
    provider_key: str
    model_name: str
    tool_ids: list[str]
    max_steps: int
    max_tool_calls: int
    max_tokens: int
    max_cost_micros: int | None
    timeout_seconds: float
    is_active: bool
    created_at: datetime
    updated_at: datetime


class AiWorkflowRunCreate(RequestModel):
    definition_id: str
    user_message: str = Field(min_length=1, max_length=32_000)
    idempotency_key: str = Field(min_length=8, max_length=255)


class AiWorkflowApprovalRequest(RequestModel):
    approval_id: str


class AiWorkflowRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    tenant_id: str
    agent_definition_id: str
    status: str
    current_step: int
    state: dict[str, Any]
    checkpoint: dict[str, Any]
    input_tokens: int
    output_tokens: int
    estimated_cost_micros: int
    cancellation_requested: bool
    last_error: str | None
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None


class AiRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    prompt_template_id: str | None
    prompt_version_id: str | None
    agent_id: str | None = None
    agent_run_id: str | None = None
    provider_key: str
    model_name: str
    status: str
    response_format: str
    variables: dict[str, Any]
    retrieval_query: str | None
    retrieved_chunk_ids: list[str]
    retrieval_degraded: bool = False
    memory_degraded: bool = False
    degradation_reason: str | None = None
    injection_chunks_filtered: int = 0
    input_messages: list[dict[str, Any]]
    output_text: str | None
    output_json: dict[str, Any] | None
    latency_ms: int | None
    input_tokens: int
    output_tokens: int
    total_tokens: int
    estimated_cost_micros: int
    error_message: str | None
    review_status: str
    created_at: datetime
    completed_at: datetime | None


class AiReviewCreate(RequestModel):
    assigned_to_user_id: str | None = None


class AiReviewDecision(RequestModel):
    status: Literal["approved", "rejected", "changes_requested"]
    reviewer_notes: str | None = None
    corrected_output: str | None = None


class AiReviewItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    run_id: str
    requested_by_user_id: str
    assigned_to_user_id: str | None
    reviewed_by_user_id: str | None
    status: str
    reviewer_notes: str | None
    corrected_output: str | None
    created_at: datetime
    updated_at: datetime


class AiFeedbackCreate(RequestModel):
    rating: Literal[-1, 1]
    comment: str | None = None
    corrected_output: str | None = None


class AiFeedbackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    run_id: str
    user_id: str
    rating: int
    comment: str | None
    corrected_output: str | None
    created_at: datetime


class AiEvaluationDatasetCreate(RequestModel):
    name: str = Field(min_length=2, max_length=255)
    description: str | None = None


class AiEvaluationDatasetUpdate(RequestModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = None


class AiEvaluationDatasetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime


class AiEvaluationCaseCreate(RequestModel):
    input_variables: dict[str, Any] = Field(default_factory=dict)
    retrieval_query: str | None = Field(default=None, min_length=1, max_length=4000)
    document_ids: list[str] = Field(default_factory=list)
    expected_chunk_ids: list[str] = Field(default_factory=list)
    expected_output_text: str | None = None
    expected_output_json: dict[str, Any] | None = None
    notes: str | None = None


class AiEvaluationCaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    dataset_id: str
    input_variables: dict[str, Any]
    retrieval_query: str | None
    document_ids: list[str]
    expected_chunk_ids: list[str]
    expected_output_text: str | None
    expected_output_json: dict[str, Any] | None
    notes: str | None
    created_at: datetime


class AiEvaluationRunRequest(RequestModel):
    prompt_version_id: str


class AiEvaluationRunItemResponse(BaseModel):
    evaluation_case_id: str
    ai_run_id: str
    score: float
    passed: bool
    notes: str | None


class AiEvaluationRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    dataset_id: str
    prompt_version_id: str
    status: str
    total_cases: int
    passed_cases: int
    average_score: float
    created_at: datetime
    completed_at: datetime | None
    items: list[AiEvaluationRunItemResponse] = Field(default_factory=list)


class AiModuleOverviewResponse(BaseModel):
    providers: list[AiProviderDescriptor]
    prompt_templates: list[AiPromptTemplateResponse]
    recent_runs: list[AiRunResponse]
    documents: list[AiDocumentResponse]
    datasets: list[AiEvaluationDatasetResponse]


def agent_definition_to_response(definition) -> AiAgentDefinitionResponse:
    return AiAgentDefinitionResponse(
        id=definition.id,
        key=definition.key,
        name=definition.name,
        version=definition.version,
        instructions=definition.instructions,
        provider_key=definition.provider_key,
        model_name=definition.model_name,
        tool_ids=definition.tool_ids_json,
        max_steps=definition.max_steps,
        max_tool_calls=definition.max_tool_calls,
        max_tokens=definition.max_tokens,
        max_cost_micros=definition.max_cost_micros,
        timeout_seconds=definition.timeout_seconds,
        is_active=definition.is_active,
        created_at=definition.created_at,
        updated_at=definition.updated_at,
    )


def workflow_run_to_response(workflow) -> AiWorkflowRunResponse:
    return AiWorkflowRunResponse(
        id=workflow.id,
        user_id=workflow.user_id,
        tenant_id=workflow.tenant_id,
        agent_definition_id=workflow.agent_definition_id,
        status=workflow.status,
        current_step=workflow.current_step,
        state=workflow.state_json,
        checkpoint=workflow.checkpoint_json,
        input_tokens=workflow.input_tokens,
        output_tokens=workflow.output_tokens,
        estimated_cost_micros=workflow.estimated_cost_micros,
        cancellation_requested=workflow.cancellation_requested,
        last_error=workflow.last_error,
        created_at=workflow.created_at,
        updated_at=workflow.updated_at,
        completed_at=workflow.completed_at,
    )


def run_to_response(run) -> AiRunResponse:
    return AiRunResponse(
        id=run.id,
        prompt_template_id=run.prompt_template_id,
        prompt_version_id=run.prompt_version_id,
        agent_id=getattr(run, "agent_id", None),
        agent_run_id=getattr(run, "agent_run_id", None),
        provider_key=run.provider_key,
        model_name=run.model_name,
        status=run.status,
        response_format=run.response_format,
        variables=run.variables_json,
        retrieval_query=run.retrieval_query,
        retrieved_chunk_ids=run.retrieved_chunk_ids_json,
        retrieval_degraded=getattr(run, "retrieval_degraded", False),
        memory_degraded=getattr(run, "memory_degraded", False),
        degradation_reason=getattr(run, "degradation_reason", None),
        injection_chunks_filtered=getattr(run, "injection_chunks_filtered", 0),
        input_messages=run.input_messages_json,
        output_text=run.output_text,
        output_json=run.output_json,
        latency_ms=run.latency_ms,
        input_tokens=run.input_tokens,
        output_tokens=run.output_tokens,
        total_tokens=run.total_tokens,
        estimated_cost_micros=run.estimated_cost_micros,
        error_message=run.error_message,
        review_status=run.review_status,
        created_at=run.created_at,
        completed_at=run.completed_at,
    )


def _prompt_template_to_response(template) -> AiPromptTemplateResponse:
    return AiPromptTemplateResponse.model_validate(template)


def _prompt_version_to_response(version) -> AiPromptVersionResponse:
    return AiPromptVersionResponse(
        id=version.id,
        prompt_template_id=version.prompt_template_id,
        version_number=version.version_number,
        provider_key=version.provider_key,
        model_name=version.model_name,
        system_prompt=version.system_prompt,
        user_prompt_template=version.user_prompt_template,
        variable_definitions=version.variable_definitions_json,
        response_format=version.response_format,
        temperature=version.temperature,
        rollout_percentage=version.rollout_percentage,
        is_published=version.is_published,
        input_cost_per_million=version.input_cost_per_million,
        output_cost_per_million=version.output_cost_per_million,
        created_by_user_id=version.created_by_user_id,
        created_at=version.created_at,
    )


def _document_to_response(document) -> AiDocumentResponse:
    return AiDocumentResponse(
        id=document.id,
        title=document.title,
        description=document.description,
        filename=document.filename,
        content_type=document.content_type,
        size_bytes=document.size_bytes,
        ingestion_status=document.ingestion_status,
        metadata=document.metadata_json,
        chunk_count=document.chunk_count,
        created_at=document.created_at,
        updated_at=document.updated_at,
    )


def _review_to_response(review) -> AiReviewItemResponse:
    return AiReviewItemResponse.model_validate(review)


def _feedback_to_response(feedback) -> AiFeedbackResponse:
    return AiFeedbackResponse.model_validate(feedback)


def _dataset_to_response(dataset) -> AiEvaluationDatasetResponse:
    return AiEvaluationDatasetResponse.model_validate(dataset)


def _dataset_case_to_response(case) -> AiEvaluationCaseResponse:
    return AiEvaluationCaseResponse(
        id=case.id,
        dataset_id=case.dataset_id,
        input_variables=case.input_variables_json,
        retrieval_query=case.retrieval_query,
        document_ids=case.document_ids_json,
        expected_chunk_ids=case.expected_chunk_ids_json,
        expected_output_text=case.expected_output_text,
        expected_output_json=case.expected_output_json,
        notes=case.notes,
        created_at=case.created_at,
    )
