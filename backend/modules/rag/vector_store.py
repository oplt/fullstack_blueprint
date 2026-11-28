from __future__ import annotations

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import settings
from backend.core.db.vector_search import MAX_JSON_FALLBACK_ROWS, VectorSearchUnavailable
from backend.modules.rag import telemetry as metrics
from backend.modules.rag.config import RagConfig
from backend.modules.rag.domain import RetrievedChunk
from backend.modules.rag.filters import RetrievalMetadataFilter
from backend.modules.rag.repository import RagRepository
from backend.modules.rag.scope import RetrievalScope, document_ids_is_empty_allow_list
from backend.modules.rag.search_repository import RagSearchRepository

logger = logging.getLogger(__name__)


def _parse_scope(filters: dict | None) -> tuple[list[str] | None, bool]:
    """Return (document_ids, owner_scoped) from filters dict.

    Missing document_ids key → None (unscoped generic RAG).
    Present empty list → [] (I1 empty allow-list).
    owner_scoped defaults True; explicit allow-list mode sets False (I2).
    """
    if filters is None:
        return None, True
    owner_scoped = bool(filters.get("owner_scoped", True))
    if "document_ids" not in filters:
        return None, owner_scoped
    raw = filters.get("document_ids")
    if raw is None:
        return None, owner_scoped
    return list(raw), owner_scoped


class PgVectorAdapter:
    """
    Postgres pgvector-backed vector store.

    Uses HNSW indexed cosine search when pgvector is available and embedding
    dimensions match RAG_EMBEDDING_DIMENSIONS. Falls back to a bounded JSON scan
    for legacy rows that were never indexed into pgvector.
    """

    def __init__(self, db: AsyncSession, config: RagConfig | None = None):
        self.db = db
        self.repo = RagRepository(db)
        self.search_repo = RagSearchRepository(db)
        self.config = config or RagConfig.from_settings()

    async def similarity_search(
        self,
        query: str,
        *,
        user_id: str,
        project_id: str | None,
        top_k: int,
        filters: dict | None = None,
        query_embedding: list[float] | None = None,
    ) -> list[RetrievedChunk]:
        del query
        if query_embedding is None:
            return []

        document_ids, owner_scoped = _parse_scope(filters)
        if document_ids_is_empty_allow_list(document_ids):
            return []
        exclude_parents = bool((filters or {}).get("exclude_parents", False))
        index_revision_ids = (filters or {}).get("index_revision_ids")
        metadata = (filters or {}).get("metadata")
        scope = RetrievalScope(
            user_id=user_id,
            project_id=project_id,
            document_ids=tuple(document_ids) if document_ids is not None else None,
            owner_scoped=owner_scoped,
            exclude_parents=exclude_parents,
            index_revision_ids=(
                tuple(index_revision_ids) if index_revision_ids is not None else None
            ),
            metadata=RetrievalMetadataFilter.model_validate(metadata)
            if metadata is not None
            else None,
        )

        indexed = await self.search_repo.similarity_search_indexed(
            scope=scope,
            query_embedding=query_embedding,
            top_k=top_k,
            score_threshold=self.config.score_threshold,
            iterative_scan=getattr(self.config, "pgvector_iterative_scan", False),
        )
        if indexed is None:
            if settings.is_production:
                raise VectorSearchUnavailable("pgvector_required_for_production")
            logger.debug(
                "Using JSON embedding fallback for query "
                "(pgvector unavailable or dimension mismatch)"
            )
            metrics.rag_json_fallback_total.inc()
            return await self.search_repo.similarity_search_json_fallback(
                scope=scope,
                query_embedding=query_embedding,
                top_k=top_k,
                score_threshold=self.config.score_threshold,
                exact_max_rows=self._json_fallback_max_rows(),
            )

        if indexed:
            return indexed

        if settings.is_production:
            fallback = []
        else:
            logger.debug("Indexed search returned no matches; trying JSON embedding fallback")
            metrics.rag_json_fallback_total.inc()
            fallback = await self.search_repo.similarity_search_json_fallback(
                scope=scope,
                query_embedding=query_embedding,
                top_k=top_k,
                score_threshold=self.config.score_threshold,
                exact_max_rows=self._json_fallback_max_rows(),
            )
        return fallback

    def _json_fallback_max_rows(self) -> int:
        configured = int(
            getattr(self.config, "exact_vector_fallback_max_rows", MAX_JSON_FALLBACK_ROWS)
        )
        return min(MAX_JSON_FALLBACK_ROWS, max(0, configured))

    async def delete_document(self, document_id: str, user_id: str) -> None:
        del user_id
        await self.repo.delete_chunks_for_document(document_id)


def build_vector_store(db: AsyncSession, config: RagConfig | None = None) -> PgVectorAdapter:
    return PgVectorAdapter(db, config)
