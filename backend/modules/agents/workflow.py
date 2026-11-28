from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import settings
from backend.modules.agents.contracts import AgentRunState, ToolApprovalRequest, ToolExecutionResult
from backend.modules.agents.runtime import AgentDefinitionConfig, AgentRuntime
from backend.modules.agents.tools import build_default_tool_registry
from backend.modules.agents.workflow_definitions import WorkflowStatus
from backend.modules.ai.gateway import AiModelGateway
from backend.modules.ai.models import AiAgentDefinition, AiWorkflowRun
from backend.modules.ai.repository import AiRepository
from backend.modules.ai.schemas import AiAgentDefinitionCreate
from backend.modules.identity.models import User


class DatabaseToolExecutionLedger:
    def __init__(self, repository: AiRepository, workflow_id: str) -> None:
        self.repository = repository
        self.workflow_id = workflow_id

    async def get(self, idempotency_key: str) -> ToolExecutionResult | None:
        row = await self.repository.get_tool_execution_by_key(idempotency_key)
        if row is None or row.status != "completed" or row.output_json is None:
            return None
        return ToolExecutionResult(
            tool_identifier=row.tool_identifier,
            tool_version=row.tool_version,
            output=row.output_json,
            idempotency_key=row.idempotency_key,
            attempts=row.attempts,
        )

    async def put(self, result: ToolExecutionResult) -> None:
        existing = await self.repository.get_tool_execution_by_key(result.idempotency_key)
        if existing is not None:
            return
        await self.repository.create_tool_execution(
            workflow_run_id=self.workflow_id,
            tool_identifier=result.tool_identifier,
            tool_version=result.tool_version,
            input_hash=result.audit_metadata.get("parameters_hash", result.idempotency_key),
            idempotency_key=result.idempotency_key,
            side_effect=result.audit_metadata.get("side_effect", "read_only"),
            status="completed",
            attempts=result.attempts,
            input_json={},
            output_json=result.output,
            completed_at=datetime.now(UTC),
        )


class AgentWorkflowService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = AiRepository(db)
        self.tools = build_default_tool_registry()

    async def create_definition(
        self, user: User, payload: AiAgentDefinitionCreate
    ) -> AiAgentDefinition:
        limits = {
            "max_steps": settings.AI_AGENT_MAX_STEPS,
            "max_tool_calls": settings.AI_AGENT_MAX_TOOL_CALLS,
            "max_tokens": settings.AI_AGENT_MAX_TOKENS,
            "timeout_seconds": settings.AI_AGENT_TIMEOUT_SECONDS,
        }
        for field, limit in limits.items():
            if getattr(payload, field) > limit:
                raise HTTPException(
                    status_code=422,
                    detail=f"{field} exceeds the configured agent limit",
                )
        existing = await self.repo.list_agent_definitions_for_user(user.id)
        version = max((item.version for item in existing if item.key == payload.key), default=0) + 1
        definition = await self.repo.create_agent_definition(
            user_id=user.id,
            tenant_id=user.id,
            key=payload.key,
            name=payload.name,
            version=version,
            instructions=payload.instructions,
            provider_key=payload.provider_key,
            model_name=payload.model_name,
            tool_ids_json=payload.tool_ids,
            configuration_json=payload.configuration,
            max_steps=payload.max_steps,
            max_tool_calls=payload.max_tool_calls,
            max_tokens=payload.max_tokens,
            max_cost_micros=payload.max_cost_micros,
            timeout_seconds=payload.timeout_seconds,
        )
        await self.db.commit()
        await self.db.refresh(definition)
        return definition

    async def list_definitions(self, user: User) -> list[AiAgentDefinition]:
        return await self.repo.list_agent_definitions_for_user(user.id)

    async def start(
        self,
        user: User,
        *,
        definition_id: str,
        user_message: str,
        idempotency_key: str,
    ) -> AiWorkflowRun:
        definition = await self.repo.get_agent_definition_for_user(user.id, definition_id)
        if definition is None:
            raise HTTPException(status_code=404, detail="Agent definition not found")
        existing = await self.repo.get_workflow_by_idempotency_key(idempotency_key)
        if existing is not None:
            if existing.user_id != user.id:
                raise HTTPException(status_code=409, detail="Workflow idempotency key is in use")
            return existing
        try:
            async with self.db.begin_nested():
                workflow = await self.repo.create_workflow_run(
                    user_id=user.id,
                    tenant_id=user.id,
                    agent_definition_id=definition.id,
                    status=WorkflowStatus.PENDING.value,
                    state_json={
                        "run_id": str(uuid4()),
                        "messages": [{"role": "user", "content": user_message}],
                    },
                    checkpoint_json={},
                    idempotency_key=idempotency_key,
                    resume_token=uuid4().hex,
                )
        except IntegrityError as exc:
            existing = await self.repo.get_workflow_by_idempotency_key(idempotency_key)
            if existing is None:
                raise exc from None
            if existing.user_id != user.id:
                raise HTTPException(
                    status_code=409,
                    detail="Workflow idempotency key is in use",
                ) from None
            return existing
        await self.db.commit()
        await self._execute(user, workflow, definition)
        return workflow

    async def get(self, user: User, workflow_id: str) -> AiWorkflowRun:
        workflow = await self.repo.get_workflow_for_user(user.id, workflow_id)
        if workflow is None:
            raise HTTPException(status_code=404, detail="Workflow run not found")
        return workflow

    async def approve_and_resume(
        self, user: User, workflow_id: str, approval_id: str
    ) -> AiWorkflowRun:
        workflow = await self.get(user, workflow_id)
        approval = await self.repo.get_tool_approval(approval_id)
        if approval is None or approval.workflow_run_id != workflow.id:
            raise HTTPException(status_code=404, detail="Approval not found")
        if approval.tenant_id != user.id:
            raise HTTPException(status_code=403, detail="Approval tenant mismatch")
        now = datetime.now(UTC)
        if approval.status != "pending" or approval.expires_at <= now:
            raise HTTPException(status_code=409, detail="Approval is expired or already decided")
        definition = await self.repo.get_agent_definition_for_user(
            user.id, workflow.agent_definition_id
        )
        if definition is None:
            raise HTTPException(status_code=404, detail="Agent definition not found")
        if not await self.repo.approve_tool_approval(approval.id, workflow.id, user.id, now):
            raise HTTPException(status_code=409, detail="Approval is expired or already decided")
        transitioned = await self.repo.transition_workflow(
            workflow.id,
            expected_statuses={WorkflowStatus.AWAITING_APPROVAL.value},
            values={"status": WorkflowStatus.RUNNING.value},
        )
        if not transitioned:
            await self.db.rollback()
            raise HTTPException(status_code=409, detail="Workflow is no longer awaiting approval")
        await self.db.commit()
        await self.db.refresh(workflow)
        await self._execute(
            user,
            workflow,
            definition,
            approved_hashes=frozenset({approval.parameters_hash}),
        )
        return workflow

    async def resume(self, user: User, workflow_id: str) -> AiWorkflowRun:
        workflow = await self.get(user, workflow_id)
        if workflow.status not in {
            WorkflowStatus.PENDING.value,
            WorkflowStatus.FAILED.value,
        }:
            raise HTTPException(status_code=409, detail="Workflow is not resumable")
        definition = await self.repo.get_agent_definition_for_user(
            user.id, workflow.agent_definition_id
        )
        if definition is None:
            raise HTTPException(status_code=404, detail="Agent definition not found")
        transitioned = await self.repo.transition_workflow(
            workflow.id,
            expected_statuses={WorkflowStatus.PENDING.value, WorkflowStatus.FAILED.value},
            values={"status": WorkflowStatus.RUNNING.value, "last_error": None},
        )
        if not transitioned:
            raise HTTPException(status_code=409, detail="Workflow is not resumable")
        await self.db.commit()
        await self.db.refresh(workflow)
        await self._execute(user, workflow, definition)
        return workflow

    async def cancel(self, user: User, workflow_id: str) -> AiWorkflowRun:
        workflow = await self.get(user, workflow_id)
        transitioned = await self.repo.transition_workflow(
            workflow.id,
            expected_statuses={
                WorkflowStatus.PENDING.value,
                WorkflowStatus.RUNNING.value,
                WorkflowStatus.AWAITING_APPROVAL.value,
            },
            values={
                "cancellation_requested": True,
                "status": WorkflowStatus.CANCELLED.value,
                "completed_at": datetime.now(UTC),
            },
        )
        if not transitioned:
            raise HTTPException(status_code=409, detail="Workflow is already finished")
        await self.db.commit()
        await self.db.refresh(workflow)
        return workflow

    async def _execute(
        self,
        user: User,
        workflow: AiWorkflowRun,
        definition: AiAgentDefinition,
        *,
        approved_hashes: frozenset[str] = frozenset(),
    ) -> None:
        state = _state_from_json(workflow.state_json)
        provider = AiModelGateway()
        runtime = AgentRuntime(
            provider=provider,
            tools=self.tools,
            ledger=DatabaseToolExecutionLedger(self.repo, workflow.id),
        )

        async def checkpoint(next_state: AgentRunState) -> None:
            if next_state.approval and next_state.approval.approval_id is None:
                expires_at = datetime.now(UTC) + timedelta(seconds=settings.AI_APPROVAL_TTL_SECONDS)
                approval = await self.repo.create_tool_approval(
                    workflow_run_id=workflow.id,
                    tool_identifier=next_state.approval.tool_identifier,
                    tool_version=next_state.approval.tool_version,
                    parameters_hash=next_state.approval.parameters_hash,
                    tenant_id=next_state.approval.tenant_id,
                    execution_context_hash=next_state.approval.parameters_hash,
                    status="pending",
                    expires_at=expires_at,
                )
                next_state.approval = next_state.approval.model_copy(
                    update={"approval_id": approval.id, "expires_at": expires_at.isoformat()}
                )
            state_json = _state_to_json(next_state)
            persisted = await self.repo.transition_workflow(
                workflow.id,
                expected_statuses={
                    WorkflowStatus.PENDING.value,
                    WorkflowStatus.RUNNING.value,
                    WorkflowStatus.AWAITING_APPROVAL.value,
                },
                values={
                    "status": next_state.status,
                    "current_step": next_state.step,
                    "input_tokens": next_state.input_tokens,
                    "output_tokens": next_state.output_tokens,
                    "estimated_cost_micros": next_state.estimated_cost_micros,
                    "state_json": state_json,
                    "checkpoint_json": {
                        "sequence": next_state.step,
                        "status": next_state.status,
                    },
                },
            )
            if not persisted:
                raise RuntimeError("Workflow is no longer active")
            await self.repo.create_workflow_checkpoint(
                workflow_run_id=workflow.id,
                sequence=next_state.step,
                status=next_state.status,
                state_json=state_json,
            )
            await self.db.commit()
            await self.db.refresh(workflow)

        try:
            await runtime.run(
                AgentDefinitionConfig(
                    key=definition.key,
                    name=definition.name,
                    instructions=definition.instructions,
                    provider_key=definition.provider_key,
                    model_name=definition.model_name,
                    tool_ids=definition.tool_ids_json,
                    max_steps=definition.max_steps,
                    max_tool_calls=definition.max_tool_calls,
                    max_tokens=definition.max_tokens,
                    max_cost_micros=definition.max_cost_micros,
                    timeout_seconds=definition.timeout_seconds,
                ),
                run_id=state.run_id,
                user_id=user.id,
                tenant_id=user.id,
                messages=[],
                permissions=frozenset({"ai.tool.read"}),
                is_admin=user.is_admin,
                approved_action_hashes=approved_hashes,
                initial_state=state,
                checkpoint=checkpoint,
            )
        except Exception as exc:
            await self.db.rollback()
            await self.db.refresh(workflow)
            if workflow.status == WorkflowStatus.CANCELLED.value:
                return
            workflow.status = WorkflowStatus.FAILED.value
            workflow.last_error = "Agent workflow execution failed"
            workflow.completed_at = datetime.now(UTC)
            await self.db.commit()
            raise exc
        if workflow.status in {
            WorkflowStatus.COMPLETED.value,
            WorkflowStatus.FAILED.value,
            WorkflowStatus.CANCELLED.value,
        }:
            workflow.completed_at = datetime.now(UTC)
            await self.db.commit()


def _state_to_json(state: AgentRunState) -> dict[str, Any]:
    return {
        "run_id": state.run_id,
        "status": state.status,
        "step": state.step,
        "tool_calls": state.tool_calls,
        "input_tokens": state.input_tokens,
        "output_tokens": state.output_tokens,
        "estimated_cost_micros": state.estimated_cost_micros,
        "messages": state.messages,
        "last_error": state.last_error,
        "approval": state.approval.model_dump(mode="json") if state.approval else None,
        "pending_tool_call": state.pending_tool_call,
        "output_text": state.output_text,
        "output_json": state.output_json,
    }


def _state_from_json(payload: dict[str, Any]) -> AgentRunState:
    return AgentRunState(
        run_id=payload["run_id"],
        status=payload.get("status", "running"),
        step=int(payload.get("step", 0)),
        tool_calls=int(payload.get("tool_calls", 0)),
        input_tokens=int(payload.get("input_tokens", 0)),
        output_tokens=int(payload.get("output_tokens", 0)),
        estimated_cost_micros=int(payload.get("estimated_cost_micros", 0)),
        messages=list(payload.get("messages", [])),
        last_error=payload.get("last_error"),
        approval=(
            ToolApprovalRequest.model_validate(payload["approval"])
            if payload.get("approval")
            else None
        ),
        pending_tool_call=payload.get("pending_tool_call"),
        output_text=payload.get("output_text"),
        output_json=payload.get("output_json"),
    )
