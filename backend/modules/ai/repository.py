from sqlalchemy import exists, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.pagination import DEFAULT_PAGE_LIMIT, paginate_scalars
from backend.modules.ai.models import (
    AiAgentDefinition,
    AiArtifact,
    AiConversation,
    AiConversationMessage,
    AiEvaluationCase,
    AiEvaluationDataset,
    AiEvaluationRun,
    AiEvaluationRunItem,
    AiFeedback,
    AiMessagePart,
    AiPromptTemplate,
    AiPromptVersion,
    AiReviewItem,
    AiRun,
    AiRunStep,
    AiToolApproval,
    AiToolCallRecord,
    AiToolExecution,
    AiUsageRecord,
    AiWorkflowCheckpoint,
    AiWorkflowRun,
)


class AiRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_prompt_templates_for_user(
        self,
        user_id: str,
        *,
        limit: int = DEFAULT_PAGE_LIMIT,
        offset: int = 0,
    ) -> tuple[list[AiPromptTemplate], int]:
        stmt = (
            select(AiPromptTemplate)
            .where(AiPromptTemplate.user_id == user_id)
            .order_by(AiPromptTemplate.updated_at.desc())
        )
        return await paginate_scalars(self.db, stmt, limit=limit, offset=offset)

    async def get_prompt_template_for_user(
        self, user_id: str, template_id: str
    ) -> AiPromptTemplate | None:
        result = await self.db.execute(
            select(AiPromptTemplate).where(
                AiPromptTemplate.user_id == user_id,
                AiPromptTemplate.id == template_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_prompt_template_by_key_for_user(
        self, user_id: str, key: str
    ) -> AiPromptTemplate | None:
        result = await self.db.execute(
            select(AiPromptTemplate).where(
                AiPromptTemplate.user_id == user_id,
                AiPromptTemplate.key == key,
            )
        )
        return result.scalar_one_or_none()

    async def create_prompt_template(self, **kwargs) -> AiPromptTemplate:
        template = AiPromptTemplate(**kwargs)
        self.db.add(template)
        await self.db.flush()
        return template

    async def list_prompt_versions(
        self,
        template_id: str,
        *,
        limit: int = DEFAULT_PAGE_LIMIT,
        offset: int = 0,
    ) -> tuple[list[AiPromptVersion], int]:
        stmt = (
            select(AiPromptVersion)
            .where(AiPromptVersion.prompt_template_id == template_id)
            .order_by(AiPromptVersion.version_number.desc())
        )
        return await paginate_scalars(self.db, stmt, limit=limit, offset=offset)

    async def get_prompt_version(self, version_id: str) -> AiPromptVersion | None:
        result = await self.db.execute(
            select(AiPromptVersion).where(AiPromptVersion.id == version_id)
        )
        return result.scalar_one_or_none()

    async def create_prompt_version(self, **kwargs) -> AiPromptVersion:
        version = AiPromptVersion(**kwargs)
        self.db.add(version)
        await self.db.flush()
        return version

    async def create_run(self, **kwargs) -> AiRun:
        run = AiRun(**kwargs)
        self.db.add(run)
        await self.db.flush()
        return run

    async def create_conversation(self, **kwargs) -> AiConversation:
        conversation = AiConversation(**kwargs)
        self.db.add(conversation)
        await self.db.flush()
        return conversation

    async def get_conversation_for_user(
        self, user_id: str, conversation_id: str
    ) -> AiConversation | None:
        result = await self.db.execute(
            select(AiConversation).where(
                AiConversation.user_id == user_id,
                AiConversation.id == conversation_id,
            )
        )
        return result.scalar_one_or_none()

    async def create_message(self, **kwargs) -> AiConversationMessage:
        message = AiConversationMessage(**kwargs)
        self.db.add(message)
        await self.db.flush()
        return message

    async def create_message_part(self, **kwargs) -> AiMessagePart:
        part = AiMessagePart(**kwargs)
        self.db.add(part)
        await self.db.flush()
        return part

    async def create_run_step(self, **kwargs) -> AiRunStep:
        step = AiRunStep(**kwargs)
        self.db.add(step)
        await self.db.flush()
        return step

    async def create_tool_call(self, **kwargs) -> AiToolCallRecord:
        tool_call = AiToolCallRecord(**kwargs)
        self.db.add(tool_call)
        await self.db.flush()
        return tool_call

    async def create_artifact(self, **kwargs) -> AiArtifact:
        artifact = AiArtifact(**kwargs)
        self.db.add(artifact)
        await self.db.flush()
        return artifact

    async def create_usage_record(self, **kwargs) -> AiUsageRecord:
        usage = AiUsageRecord(**kwargs)
        self.db.add(usage)
        await self.db.flush()
        return usage

    async def create_agent_definition(self, **kwargs) -> AiAgentDefinition:
        definition = AiAgentDefinition(**kwargs)
        self.db.add(definition)
        await self.db.flush()
        return definition

    async def list_agent_definitions_for_user(self, user_id: str) -> list[AiAgentDefinition]:
        result = await self.db.execute(
            select(AiAgentDefinition)
            .where(AiAgentDefinition.user_id == user_id, AiAgentDefinition.is_active.is_(True))
            .order_by(AiAgentDefinition.updated_at.desc())
        )
        return list(result.scalars().all())

    async def get_agent_definition_for_user(
        self, user_id: str, definition_id: str
    ) -> AiAgentDefinition | None:
        result = await self.db.execute(
            select(AiAgentDefinition).where(
                AiAgentDefinition.user_id == user_id,
                AiAgentDefinition.id == definition_id,
                AiAgentDefinition.is_active.is_(True),
            )
        )
        return result.scalar_one_or_none()

    async def get_workflow_by_idempotency_key(self, idempotency_key: str) -> AiWorkflowRun | None:
        result = await self.db.execute(
            select(AiWorkflowRun).where(AiWorkflowRun.idempotency_key == idempotency_key)
        )
        return result.scalar_one_or_none()

    async def transition_workflow(
        self,
        workflow_id: str,
        *,
        expected_statuses: set[str],
        values: dict,
    ) -> bool:
        result = await self.db.execute(
            update(AiWorkflowRun)
            .where(
                AiWorkflowRun.id == workflow_id,
                AiWorkflowRun.status.in_(expected_statuses),
                AiWorkflowRun.cancellation_requested.is_(False),
            )
            .values(**values)
            .returning(AiWorkflowRun.id)
        )
        return result.scalar_one_or_none() is not None

    async def create_workflow_run(self, **kwargs) -> AiWorkflowRun:
        workflow = AiWorkflowRun(**kwargs)
        self.db.add(workflow)
        await self.db.flush()
        return workflow

    async def get_workflow_for_user(self, user_id: str, workflow_id: str) -> AiWorkflowRun | None:
        result = await self.db.execute(
            select(AiWorkflowRun).where(
                AiWorkflowRun.user_id == user_id,
                AiWorkflowRun.id == workflow_id,
            )
        )
        return result.scalar_one_or_none()

    async def create_workflow_checkpoint(self, **kwargs) -> AiWorkflowCheckpoint:
        checkpoint = AiWorkflowCheckpoint(**kwargs)
        self.db.add(checkpoint)
        await self.db.flush()
        return checkpoint

    async def create_tool_approval(self, **kwargs) -> AiToolApproval:
        approval = AiToolApproval(**kwargs)
        self.db.add(approval)
        await self.db.flush()
        return approval

    async def get_tool_approval(self, approval_id: str) -> AiToolApproval | None:
        result = await self.db.execute(
            select(AiToolApproval).where(AiToolApproval.id == approval_id)
        )
        return result.scalar_one_or_none()

    async def approve_tool_approval(
        self, approval_id: str, workflow_id: str, user_id: str, decided_at
    ) -> bool:
        awaiting_approval = exists(
            select(AiWorkflowRun.id).where(
                AiWorkflowRun.id == workflow_id,
                AiWorkflowRun.status == "awaiting_approval",
                AiWorkflowRun.cancellation_requested.is_(False),
            )
        )
        result = await self.db.execute(
            update(AiToolApproval)
            .where(
                AiToolApproval.id == approval_id,
                AiToolApproval.workflow_run_id == workflow_id,
                AiToolApproval.tenant_id == user_id,
                AiToolApproval.status == "pending",
                AiToolApproval.expires_at > decided_at,
                awaiting_approval,
            )
            .values(status="approved", approved_by_user_id=user_id, decided_at=decided_at)
            .returning(AiToolApproval.id)
        )
        return result.scalar_one_or_none() is not None

    async def create_tool_execution(self, **kwargs) -> AiToolExecution:
        execution = AiToolExecution(**kwargs)
        self.db.add(execution)
        await self.db.flush()
        return execution

    async def get_tool_execution_by_key(self, idempotency_key: str) -> AiToolExecution | None:
        result = await self.db.execute(
            select(AiToolExecution).where(AiToolExecution.idempotency_key == idempotency_key)
        )
        return result.scalar_one_or_none()

    async def get_run_for_user(self, user_id: str, run_id: str) -> AiRun | None:
        result = await self.db.execute(
            select(AiRun).where(AiRun.user_id == user_id, AiRun.id == run_id)
        )
        return result.scalar_one_or_none()

    async def list_runs_for_user(
        self,
        user_id: str,
        *,
        limit: int = DEFAULT_PAGE_LIMIT,
        offset: int = 0,
    ) -> tuple[list[AiRun], int]:
        stmt = select(AiRun).where(AiRun.user_id == user_id).order_by(AiRun.created_at.desc())
        return await paginate_scalars(self.db, stmt, limit=limit, offset=offset)

    async def get_agent_run_for_user(self, user_id: str, run_id: str) -> AiRun | None:
        result = await self.db.execute(
            select(AiRun).where(
                AiRun.user_id == user_id,
                AiRun.id == run_id,
                AiRun.agent_id.is_not(None),
            )
        )
        return result.scalar_one_or_none()

    async def list_agent_runs_for_user(
        self,
        user_id: str,
        *,
        limit: int = DEFAULT_PAGE_LIMIT,
        offset: int = 0,
    ) -> tuple[list[AiRun], int]:
        stmt = (
            select(AiRun)
            .where(AiRun.user_id == user_id, AiRun.agent_id.is_not(None))
            .order_by(AiRun.created_at.desc())
        )
        return await paginate_scalars(self.db, stmt, limit=limit, offset=offset)

    async def list_reviews_for_user(
        self,
        user_id: str,
        *,
        limit: int = DEFAULT_PAGE_LIMIT,
        offset: int = 0,
    ) -> tuple[list[AiReviewItem], int]:
        stmt = (
            select(AiReviewItem)
            .where(
                (AiReviewItem.requested_by_user_id == user_id)
                | (AiReviewItem.assigned_to_user_id == user_id)
                | (AiReviewItem.reviewed_by_user_id == user_id)
            )
            .order_by(AiReviewItem.updated_at.desc())
        )
        return await paginate_scalars(self.db, stmt, limit=limit, offset=offset)

    async def get_review(self, review_id: str) -> AiReviewItem | None:
        result = await self.db.execute(select(AiReviewItem).where(AiReviewItem.id == review_id))
        return result.scalar_one_or_none()

    async def create_review(self, **kwargs) -> AiReviewItem:
        review = AiReviewItem(**kwargs)
        self.db.add(review)
        await self.db.flush()
        return review

    async def list_feedback_for_run(
        self,
        run_id: str,
        *,
        limit: int = DEFAULT_PAGE_LIMIT,
        offset: int = 0,
    ) -> tuple[list[AiFeedback], int]:
        stmt = (
            select(AiFeedback)
            .where(AiFeedback.run_id == run_id)
            .order_by(AiFeedback.created_at.desc())
        )
        return await paginate_scalars(self.db, stmt, limit=limit, offset=offset)

    async def create_feedback(self, **kwargs) -> AiFeedback:
        feedback = AiFeedback(**kwargs)
        self.db.add(feedback)
        await self.db.flush()
        return feedback

    async def list_datasets_for_user(
        self,
        user_id: str,
        *,
        limit: int = DEFAULT_PAGE_LIMIT,
        offset: int = 0,
    ) -> tuple[list[AiEvaluationDataset], int]:
        stmt = (
            select(AiEvaluationDataset)
            .where(AiEvaluationDataset.user_id == user_id)
            .order_by(AiEvaluationDataset.updated_at.desc())
        )
        return await paginate_scalars(self.db, stmt, limit=limit, offset=offset)

    async def get_dataset_for_user(
        self, user_id: str, dataset_id: str
    ) -> AiEvaluationDataset | None:
        result = await self.db.execute(
            select(AiEvaluationDataset).where(
                AiEvaluationDataset.user_id == user_id,
                AiEvaluationDataset.id == dataset_id,
            )
        )
        return result.scalar_one_or_none()

    async def create_dataset(self, **kwargs) -> AiEvaluationDataset:
        dataset = AiEvaluationDataset(**kwargs)
        self.db.add(dataset)
        await self.db.flush()
        return dataset

    async def list_dataset_cases(
        self,
        dataset_id: str,
        *,
        limit: int = DEFAULT_PAGE_LIMIT,
        offset: int = 0,
    ) -> tuple[list[AiEvaluationCase], int]:
        stmt = (
            select(AiEvaluationCase)
            .where(AiEvaluationCase.dataset_id == dataset_id)
            .order_by(AiEvaluationCase.created_at.asc())
        )
        return await paginate_scalars(self.db, stmt, limit=limit, offset=offset)

    async def get_dataset_case(self, case_id: str) -> AiEvaluationCase | None:
        result = await self.db.execute(
            select(AiEvaluationCase).where(AiEvaluationCase.id == case_id)
        )
        return result.scalar_one_or_none()

    async def create_dataset_case(self, **kwargs) -> AiEvaluationCase:
        case = AiEvaluationCase(**kwargs)
        self.db.add(case)
        await self.db.flush()
        return case

    async def create_evaluation_run(self, **kwargs) -> AiEvaluationRun:
        evaluation_run = AiEvaluationRun(**kwargs)
        self.db.add(evaluation_run)
        await self.db.flush()
        return evaluation_run

    async def get_evaluation_run_by_id(self, evaluation_run_id: str) -> AiEvaluationRun | None:
        result = await self.db.execute(
            select(AiEvaluationRun).where(AiEvaluationRun.id == evaluation_run_id)
        )
        return result.scalar_one_or_none()

    async def create_evaluation_run_item(self, **kwargs) -> AiEvaluationRunItem:
        item = AiEvaluationRunItem(**kwargs)
        self.db.add(item)
        await self.db.flush()
        return item

    async def create_evaluation_run_items_batch(
        self, items: list[dict]
    ) -> list[AiEvaluationRunItem]:
        rows = [AiEvaluationRunItem(**payload) for payload in items]
        self.db.add_all(rows)
        await self.db.flush()
        return rows

    async def list_evaluation_runs_for_user(
        self,
        user_id: str,
        *,
        limit: int = DEFAULT_PAGE_LIMIT,
        offset: int = 0,
    ) -> tuple[list[AiEvaluationRun], int]:
        stmt = (
            select(AiEvaluationRun)
            .where(AiEvaluationRun.user_id == user_id)
            .order_by(AiEvaluationRun.created_at.desc())
        )
        return await paginate_scalars(self.db, stmt, limit=limit, offset=offset)
