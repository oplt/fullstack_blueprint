import asyncio

from fastapi import APIRouter, Depends, HTTPException
from pydantic import Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import settings
from backend.core.pagination import (
    PaginatedResponse,
    PaginationParams,
    paginated_response,
    pagination_params,
)
from backend.dependencies.auth import get_current_user
from backend.dependencies.db import get_db
from backend.modules.ai.agent_workflow_service import AgentWorkflowService
from backend.modules.ai.application.agent_service import AgentService
from backend.modules.ai.dependencies import enforce_ai_generation_rate_limit
from backend.modules.ai.schemas import (
    AiAgentDefinitionCreate,
    AiAgentDefinitionResponse,
    AiRunRequest,
    AiRunResponse,
    AiWorkflowRunCreate,
    AiWorkflowRunResponse,
)
from backend.modules.ai.serializers import (
    agent_definition_to_response,
    run_to_response,
    workflow_run_to_response,
)
from backend.modules.identity_access.models import User

router = APIRouter()


class AgentRunRequest(AiRunRequest):
    agent_id: str = Field(default="default", min_length=1, max_length=128)
    run_id: str | None = Field(default=None, max_length=64)
    project_id: str | None = None
    user_message: str | None = Field(default=None, max_length=8000)


class AgentRunResponse(AiRunResponse):
    memory_run_id: str


def _agent_run_to_response(run) -> AgentRunResponse:
    return AgentRunResponse(
        **run_to_response(run).model_dump(),
        memory_run_id=getattr(run, "agent_run_id", None) or run.id,
    )


@router.get("/runs", response_model=PaginatedResponse[AgentRunResponse])
async def list_agent_runs(
    pagination: PaginationParams = Depends(pagination_params),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    runs, total = await AgentService(db).list_runs(
        current_user, limit=pagination.limit, offset=pagination.offset
    )
    return paginated_response(
        [_agent_run_to_response(run) for run in runs],
        total=total,
        limit=pagination.limit,
        offset=pagination.offset,
    )


@router.get("/runs/{run_id}", response_model=AgentRunResponse)
async def get_agent_run(
    run_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _agent_run_to_response(await AgentService(db).get_run(current_user, run_id))


@router.post("/runs", response_model=AgentRunResponse, status_code=201)
async def create_agent_run(
    payload: AgentRunRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _rate_limit: None = Depends(enforce_ai_generation_rate_limit),
):
    service = AgentService(db)
    try:
        run, memory_run_id, _working = await asyncio.wait_for(
            service.run_agent_prompt(
                current_user,
                prompt_template_key=payload.prompt_template_key,
                prompt_version_id=payload.prompt_version_id,
                variables=payload.variables,
                retrieval_query=payload.retrieval_query,
                document_ids=payload.document_ids,
                top_k=payload.top_k,
                review_required=payload.review_required,
                agent_id=payload.agent_id,
                run_id=payload.run_id,
                project_id=payload.project_id,
                user_message=payload.user_message,
            ),
            timeout=settings.AI_REQUEST_TIMEOUT_SECONDS,
        )
    except TimeoutError as exc:
        raise HTTPException(status_code=504, detail="Agent run timed out") from exc
    return _agent_run_to_response(run).model_copy(update={"memory_run_id": memory_run_id})


@router.get("/definitions", response_model=list[AiAgentDefinitionResponse])
async def list_agent_definitions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    definitions = await AgentWorkflowService(db).list_definitions(current_user)
    return [agent_definition_to_response(item) for item in definitions]


@router.post("/definitions", response_model=AiAgentDefinitionResponse, status_code=201)
async def create_agent_definition(
    payload: AiAgentDefinitionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    definition = await AgentWorkflowService(db).create_definition(current_user, payload)
    await db.commit()
    await db.refresh(definition)
    return agent_definition_to_response(definition)


@router.post("/workflow-runs", response_model=AiWorkflowRunResponse, status_code=201)
async def start_agent_workflow(
    payload: AiWorkflowRunCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _rate_limit: None = Depends(enforce_ai_generation_rate_limit),
):
    workflow = await AgentWorkflowService(db).start(
        current_user,
        definition_id=payload.definition_id,
        user_message=payload.user_message,
        idempotency_key=payload.idempotency_key,
    )
    return workflow_run_to_response(workflow)


@router.get("/workflow-runs/{workflow_id}", response_model=AiWorkflowRunResponse)
async def get_agent_workflow(
    workflow_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workflow = await AgentWorkflowService(db).get(current_user, workflow_id)
    return workflow_run_to_response(workflow)


@router.post(
    "/workflow-runs/{workflow_id}/approvals/{approval_id}",
    response_model=AiWorkflowRunResponse,
)
async def approve_agent_workflow(
    workflow_id: str,
    approval_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _rate_limit: None = Depends(enforce_ai_generation_rate_limit),
):
    workflow = await AgentWorkflowService(db).approve_and_resume(
        current_user, workflow_id, approval_id
    )
    return workflow_run_to_response(workflow)


@router.post("/workflow-runs/{workflow_id}/cancel", response_model=AiWorkflowRunResponse)
async def cancel_agent_workflow(
    workflow_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workflow = await AgentWorkflowService(db).cancel(current_user, workflow_id)
    return workflow_run_to_response(workflow)


@router.post("/workflow-runs/{workflow_id}/resume", response_model=AiWorkflowRunResponse)
async def resume_agent_workflow(
    workflow_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _rate_limit: None = Depends(enforce_ai_generation_rate_limit),
):
    workflow = await AgentWorkflowService(db).resume(current_user, workflow_id)
    return workflow_run_to_response(workflow)
