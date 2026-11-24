from __future__ import annotations

from backend.core.config import settings
from backend.core.pagination import DEFAULT_PAGE_LIMIT
from backend.modules.ai.evaluation_service import AiEvaluationService, _EvaluationCaseResult
from backend.modules.ai.provider_service import AiProviderService
from backend.modules.ai.review_service import AiReviewService
from backend.modules.identity_access.models import User


class AiService(AiEvaluationService, AiReviewService, AiProviderService):
    """Compatibility facade and cross-capability overview coordinator."""

    async def get_overview(self, user: User):
        # An AsyncSession represents one transaction and cannot execute concurrently.
        prompt_templates, _ = await self.repo.list_prompt_templates_for_user(
            user.id, limit=DEFAULT_PAGE_LIMIT, offset=0
        )
        recent_runs, _ = await self.repo.list_runs_for_user(user.id, limit=10, offset=0)
        documents = []
        if settings.RAG_ENABLED:
            documents, _ = await self.list_documents(user, limit=DEFAULT_PAGE_LIMIT, offset=0)
        datasets, _ = await self.repo.list_datasets_for_user(
            user.id, limit=DEFAULT_PAGE_LIMIT, offset=0
        )
        return {
            "providers": self.list_provider_descriptors(),
            "prompt_templates": prompt_templates,
            "recent_runs": recent_runs,
            "documents": documents,
            "datasets": datasets,
        }


__all__ = ["AiService", "_EvaluationCaseResult"]
