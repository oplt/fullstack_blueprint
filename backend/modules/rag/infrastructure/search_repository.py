"""Tenant-scoped dense and lexical RAG search queries."""

from __future__ import annotations

import json
import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.lib.vector_search import (
    DenseFallbackScopeTooLarge,
    embedding_is_indexable,
    parse_embedding_json,
    rank_embedding_matches,
)
from backend.lib.vector_search import pgvector_is_available as check_pgvector_is_available
from backend.lib.vectors import vector_literal
from backend.modules.rag.domain.models import RetrievedChunk
from backend.modules.rag.infrastructure.lexical_languages import POSTGRES_TEXT_SEARCH_CONFIGS

logger = logging.getLogger(__name__)

_LANGUAGE_METADATA_SQL = """
COALESCE(
    c.metadata_json::json->>'language',
    c.metadata_json::json->>'language_code',
    d.metadata_json::json->>'language',
    d.metadata_json::json->>'language_code',
    ''
)
"""
_LANGUAGE_CONFIG_CASE_SQL = "\n".join(
    [
        "CASE lower(split_part(" + _LANGUAGE_METADATA_SQL + ", '-', 1))",
        *[
            f"WHEN '{language}' THEN '{config}'"
            for language, config in sorted(POSTGRES_TEXT_SEARCH_CONFIGS.items())
        ],
        "ELSE 'simple' END",
    ]
)


class RagSearchRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def pgvector_is_available(self) -> bool:
        return await check_pgvector_is_available(self.db)

    def _retrieval_scope_filters(
        self,
        *,
        user_id: str,
        project_id: str | None,
        document_ids: list[str] | None,
        owner_scoped: bool,
        params: dict,
        exclude_parents: bool = False,
        index_revision_ids: list[str] | None = None,
    ) -> list[str] | None:
        """Build shared WHERE clauses. Returns None when empty allow-list (I1)."""
        from backend.modules.rag.application.document_scope import (
            document_ids_is_empty_allow_list,
            should_apply_document_id_filter,
        )

        if document_ids_is_empty_allow_list(document_ids):
            return None

        filters = [
            "d.status = 'indexed'",
            "d.deleted_at IS NULL",
        ]
        if index_revision_ids is None:
            filters.append(
                "(d.current_revision_id = c.revision_id OR "
                "(d.current_revision_id IS NULL AND c.revision_id IS NULL))"
            )
        elif not index_revision_ids:
            return None
        else:
            filters.append("c.revision_id = ANY(:index_revision_ids)")
            params["index_revision_ids"] = index_revision_ids
        if owner_scoped:
            filters.append("c.user_id = :user_id")
            filters.append("d.user_id = :user_id")
            filters.append(
                "(d.project_id IS NULL OR d.project_id IN ("
                "SELECT project_id FROM project_members WHERE user_id = :user_id))"
            )
            params["user_id"] = user_id
        if project_id:
            filters.append("c.project_id = :project_id")
            params["project_id"] = project_id
        if should_apply_document_id_filter(document_ids):
            filters.append("c.document_id = ANY(:document_ids)")
            params["document_ids"] = list(document_ids or [])
        if exclude_parents:
            # Parents use negative chunk_index and/or chunk_role=parent metadata.
            filters.append("c.chunk_index >= 0")
            filters.append(
                "(c.metadata_json IS NULL OR "
                "COALESCE(c.metadata_json::json->>'chunk_role', 'child') <> 'parent')"
            )
        return filters

    async def similarity_search_indexed(
        self,
        *,
        user_id: str,
        project_id: str | None,
        document_ids: list[str] | None,
        query_embedding: list[float],
        top_k: int,
        score_threshold: float,
        owner_scoped: bool = True,
        exclude_parents: bool = False,
        index_revision_ids: list[str] | None = None,
    ) -> list[RetrievedChunk] | None:
        if not await check_pgvector_is_available(self.db):
            return None
        if not embedding_is_indexable(query_embedding):
            return None

        params: dict = {
            "query_vec": vector_literal(query_embedding),
            "score_threshold": score_threshold,
            "top_k": top_k,
        }
        filters = self._retrieval_scope_filters(
            user_id=user_id,
            project_id=project_id,
            document_ids=document_ids,
            owner_scoped=owner_scoped,
            params=params,
            exclude_parents=exclude_parents,
            index_revision_ids=index_revision_ids,
        )
        if filters is None:
            return []

        filters.append("c.embedding IS NOT NULL")
        filters.append("(1 - (c.embedding <=> CAST(:query_vec AS vector))) >= :score_threshold")

        sql = f"""
            SELECT
                c.id AS chunk_id,
                c.document_id,
                c.content,
                c.chunk_index,
                c.metadata_json,
                c.revision_id,
                d.original_filename,
                (1 - (c.embedding <=> CAST(:query_vec AS vector))) AS score
            FROM rag_chunks c
            INNER JOIN rag_documents d ON d.id = c.document_id
            WHERE {" AND ".join(filters)}
            ORDER BY c.embedding <=> CAST(:query_vec AS vector)
            LIMIT :top_k
        """
        try:
            result = await self.db.execute(text(sql), params)
        except Exception:
            logger.exception("Indexed pgvector search failed")
            return None

        rows = result.mappings().all()
        retrieved: list[RetrievedChunk] = []
        for row in rows:
            meta = json.loads(row["metadata_json"] or "{}")
            retrieved.append(
                RetrievedChunk(
                    chunk_id=row["chunk_id"],
                    document_id=row["document_id"],
                    content=row["content"],
                    score=round(float(row["score"]), 4),
                    filename=row["original_filename"],
                    chunk_index=row["chunk_index"],
                    page_number=meta.get("page_number"),
                    metadata=meta,
                    retrieval_sources=("dense",),
                    index_revision_id=row["revision_id"],
                )
            )
        return retrieved

    async def similarity_search_json_fallback(
        self,
        *,
        user_id: str,
        project_id: str | None,
        document_ids: list[str] | None,
        query_embedding: list[float],
        top_k: int,
        score_threshold: float,
        owner_scoped: bool = True,
        exclude_parents: bool = False,
        index_revision_ids: list[str] | None = None,
        exact_max_rows: int | None = None,
    ) -> list[RetrievedChunk]:
        params: dict = {}
        filters = self._retrieval_scope_filters(
            user_id=user_id,
            project_id=project_id,
            document_ids=document_ids,
            owner_scoped=owner_scoped,
            params=params,
            exclude_parents=exclude_parents,
            index_revision_ids=index_revision_ids,
        )
        if filters is None:
            return []

        filters.append("c.embedding_json IS NOT NULL")

        count_result = await self.db.execute(
            text(
                "SELECT COUNT(*) FROM rag_chunks c "
                "INNER JOIN rag_documents d ON d.id = c.document_id "
                f"WHERE {' AND '.join(filters)}"
            ),
            params,
        )
        eligible_count = int(count_result.scalar() or 0)
        max_rows = exact_max_rows if exact_max_rows is not None else 5000
        if eligible_count > max_rows:
            raise DenseFallbackScopeTooLarge(
                f"pgvector_required_for_scope_size:{eligible_count}>{max_rows}"
            )

        sql = f"""
            SELECT
                c.id AS chunk_id,
                c.document_id,
                c.content,
                c.chunk_index,
                c.metadata_json,
                c.revision_id,
                c.embedding_json,
                d.original_filename
            FROM rag_chunks c
            INNER JOIN rag_documents d ON d.id = c.document_id
            WHERE {" AND ".join(filters)}
            ORDER BY c.document_id, c.chunk_index, c.id
        """
        result = await self.db.execute(text(sql), params)
        rows = [
            {
                "chunk_id": row["chunk_id"],
                "document_id": row["document_id"],
                "content": row["content"],
                "chunk_index": row["chunk_index"],
                "metadata_json": row["metadata_json"],
                "revision_id": row["revision_id"],
                "original_filename": row["original_filename"],
                "embedding": parse_embedding_json(row["embedding_json"]),
            }
            for row in result.mappings().all()
        ]

        def build_match(row: dict, score: float) -> RetrievedChunk:
            meta = json.loads(row["metadata_json"] or "{}")
            return RetrievedChunk(
                chunk_id=row["chunk_id"],
                document_id=row["document_id"],
                content=row["content"],
                score=score,
                filename=row["original_filename"],
                chunk_index=row["chunk_index"],
                page_number=meta.get("page_number"),
                metadata=meta,
                retrieval_sources=("dense",),
                index_revision_id=row.get("revision_id"),
            )

        return rank_embedding_matches(
            query_embedding,
            rows,
            top_k=top_k,
            score_threshold=score_threshold,
            build_match=build_match,
        )

    async def lexical_search(
        self,
        *,
        user_id: str,
        project_id: str | None,
        document_ids: list[str] | None,
        query: str,
        top_k: int,
        owner_scoped: bool = True,
        exclude_parents: bool = False,
        index_revision_ids: list[str] | None = None,
        phrase_boost: bool = False,
    ) -> list[RetrievedChunk]:
        """Independent PostgreSQL full-text lexical ranking path."""
        params: dict = {
            "query": query,
            "top_k": top_k,
            "phrase_boost": phrase_boost,
        }
        filters = self._retrieval_scope_filters(
            user_id=user_id,
            project_id=project_id,
            document_ids=document_ids,
            owner_scoped=owner_scoped,
            params=params,
            exclude_parents=exclude_parents,
            index_revision_ids=index_revision_ids,
        )
        if filters is None:
            return []

        # A document's declared language uses its PostgreSQL stemmer where
        # available; every document is additionally searched with ``simple``.
        # This keeps Turkish and unknown languages safe and handles mixed corpora.
        sql = f"""
            WITH scoped_chunks AS (
                SELECT
                    c.id AS chunk_id,
                    c.document_id,
                    c.content,
                    c.chunk_index,
                    c.metadata_json,
                    c.revision_id,
                    d.original_filename,
                    ({_LANGUAGE_CONFIG_CASE_SQL})::regconfig AS language_config,
                    COALESCE(
                        c.content_tsv,
                        to_tsvector('simple', coalesce(c.content, ''))
                    ) AS simple_vector
                FROM rag_chunks c
                INNER JOIN rag_documents d ON d.id = c.document_id
                WHERE {" AND ".join(filters)}
            )
            SELECT *, GREATEST(
                ts_rank_cd(
                    to_tsvector(language_config, coalesce(content, '')),
                    plainto_tsquery(language_config, :query)
                ),
                ts_rank_cd(simple_vector, plainto_tsquery('simple', :query))
            ) + CASE WHEN :phrase_boost AND (
                to_tsvector(language_config, coalesce(content, ''))
                    @@ phraseto_tsquery(language_config, :query)
                OR simple_vector @@ phraseto_tsquery('simple', :query)
            ) THEN 1 ELSE 0 END AS score
            FROM scoped_chunks
            WHERE to_tsvector(language_config, coalesce(content, ''))
                @@ plainto_tsquery(language_config, :query)
               OR simple_vector @@ plainto_tsquery('simple', :query)
            ORDER BY score DESC
            LIMIT :top_k
        """
        try:
            result = await self.db.execute(text(sql), params)
        except Exception:
            logger.exception("Lexical full-text search failed")
            raise

        retrieved: list[RetrievedChunk] = []
        for rank, row in enumerate(result.mappings().all(), start=1):
            meta = json.loads(row["metadata_json"] or "{}")
            retrieved.append(
                RetrievedChunk(
                    chunk_id=row["chunk_id"],
                    document_id=row["document_id"],
                    content=row["content"],
                    score=round(float(row["score"] or 0.0), 4),
                    filename=row["original_filename"],
                    chunk_index=row["chunk_index"],
                    page_number=meta.get("page_number"),
                    metadata=meta,
                    rank=rank,
                    retrieval_sources=("lexical",),
                    index_revision_id=row["revision_id"],
                )
            )
        return retrieved
