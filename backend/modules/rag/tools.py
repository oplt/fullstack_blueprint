from __future__ import annotations

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.rag.context import RagContextBuilder
from backend.modules.rag.domain import RetrievedChunk
from backend.modules.rag.retrieval_request import RetrievalRequest
from backend.modules.rag.config import RagConfig
from backend.modules.rag.service import RagPipelineService

logger = logging.getLogger(__name__)


async def rag_search_tool(
    db: AsyncSession,
    *,
    query: str,
    user_id: str,
    project_id: str | None = None,
    top_k: int | None = None,
    document_ids: list[str] | None = None,
) -> tuple[list[RetrievedChunk], str]:
    """
    Agent-callable RAG retrieval tool.

    Returns retrieved chunks and a formatted context block for prompt injection.
    """
    config = RagConfig.from_settings()
    if not config.enabled:
        return [], ""

    pipeline = RagPipelineService(db, config)
    filters: dict | None = None
    if document_ids is not None:
        filters = {"document_ids": document_ids, "owner_scoped": True}
    try:
        outcome = await pipeline.retrieval.retrieve(
            RetrievalRequest(
                query=query,
                user_id=user_id,
                project_id=project_id,
                top_k=top_k,
                filters=filters,
            )
        )
        chunks = outcome.chunks
    except Exception:
        logger.exception("rag_search_tool failed for user=%s", user_id)
        return [], ""

    builder = RagContextBuilder()
    bounded = builder.trim_chunks_to_token_budget(
        chunks,
        max_tokens=config.max_context_tokens,
        overlap_dedupe_threshold=getattr(config, "context_overlap_dedupe_threshold", 0.8),
        ordering_policy=getattr(config, "context_ordering_policy", "relevance"),
    )
    context = builder.build_document_context_block(bounded)
    return bounded, context
