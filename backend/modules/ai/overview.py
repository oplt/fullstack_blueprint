from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import settings
from backend.core.pagination import DEFAULT_PAGE_LIMIT
from backend.modules.ai.gateway import AiModelGateway
from backend.modules.ai.runs import AiRunService
from backend.modules.identity.models import User


class AiOverviewService:
    def __init__(self, db: AsyncSession):
        self.ai = AiRunService(db)

    async def get_overview(self, user: User):
        # Keep statements sequential: one AsyncSession cannot execute concurrently.
        prompt_templates, _ = await self.ai.repo.list_prompt_templates_for_user(
            user.id, limit=DEFAULT_PAGE_LIMIT, offset=0
        )
        recent_runs, _ = await self.ai.repo.list_runs_for_user(user.id, limit=10, offset=0)
        documents = []
        if settings.RAG_ENABLED:
            documents, _ = await self.ai.list_documents(user, limit=DEFAULT_PAGE_LIMIT, offset=0)
        datasets, _ = await self.ai.repo.list_datasets_for_user(
            user.id, limit=DEFAULT_PAGE_LIMIT, offset=0
        )
        return {
            "providers": AiModelGateway.list_provider_descriptors(),
            "prompt_templates": prompt_templates,
            "recent_runs": recent_runs,
            "documents": documents,
            "datasets": datasets,
        }
