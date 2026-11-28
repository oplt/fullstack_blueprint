"""RAG use-case composition exposed to HTTP and agent adapters.

The repository remains the persistence boundary; this service owns the
public use-case surface used by the router and agent tools.
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.rag.answers import RagAnswerService
from backend.modules.rag.config import RagConfig
from backend.modules.rag.ingestion import DocumentIngestionService
from backend.modules.rag.retrieval import RetrievalService
from backend.modules.rag.repository import RagRepository


class RagReadService(RagRepository):
    """Read-only RAG use cases with the repository's tenant-scoped queries."""


class RagPipelineService:
    """Canonical composition root for ingestion, retrieval, and answers."""

    def __init__(self, db: AsyncSession, config: RagConfig | None = None):
        self.config = config or RagConfig.from_settings()
        self.ingestion = DocumentIngestionService(db, self.config)
        self._db = db
        self._retrieval: RetrievalService | None = None
        self._answers: RagAnswerService | None = None

    @property
    def retrieval(self) -> RetrievalService:
        if self._retrieval is None:
            self._retrieval = RetrievalService(self._db, self.config)
        return self._retrieval

    @property
    def answers(self) -> RagAnswerService:
        if self._answers is None:
            self._answers = RagAnswerService(
                self._db,
                self.config,
                retrieval=self.retrieval,
            )
        return self._answers
