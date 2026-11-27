"""Tenant-scoped dense and lexical RAG search queries."""

from __future__ import annotations

import json
import re

from sqlalchemy import JSON, Numeric, and_, bindparam, case, cast, func, literal, or_, select, text
from sqlalchemy.dialects.postgresql import REGCONFIG
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.elements import ColumnElement

from backend.lib.vector_search import (
    MAX_JSON_FALLBACK_ROWS,
    DenseFallbackScopeTooLarge,
    InvalidQueryEmbedding,
    VectorSearchUnavailable,
    embedding_is_indexable,
    parse_embedding_json,
    rank_embedding_matches,
)
from backend.lib.vector_search import pgvector_is_available as check_pgvector_is_available
from backend.lib.vectors import is_valid_embedding, vector_literal
from backend.modules.projects.models import ProjectMember
from backend.modules.rag.application.query_analysis import exact_identifier, quoted_phrase
from backend.modules.rag.domain.metadata_filters import RetrievalMetadataFilter
from backend.modules.rag.domain.models import RetrievedChunk
from backend.modules.rag.domain.retrieval_scope import RetrievalScope
from backend.modules.rag.infrastructure.lexical_languages import POSTGRES_TEXT_SEARCH_CONFIGS
from backend.modules.rag.infrastructure.models import RagChunk, RagDocument


def _chunk_value(key: str):
    return cast(RagChunk.metadata_json, JSON).op("->>")(key)


def _language_code():
    document_metadata = cast(RagDocument.metadata_json, JSON)
    value = func.coalesce(
        _chunk_value("language"),
        _chunk_value("language_code"),
        document_metadata.op("->>")("language"),
        document_metadata.op("->>")("language_code"),
        "",
    )
    return func.lower(func.split_part(func.replace(value, "_", "-"), "-", 1))


def _metadata_conditions(metadata: RetrievalMetadataFilter) -> list[ColumnElement[bool]]:
    conditions = []
    if metadata.formats is not None:
        conditions.append(func.lower(_chunk_value("format")).in_(metadata.formats))
    if metadata.languages is not None:
        conditions.append(_language_code().in_(metadata.languages))
    if metadata.page_from is not None or metadata.page_to is not None:
        json_page = cast(RagChunk.metadata_json, JSON).op("->")("page_number")
        page = case(
            (func.json_typeof(json_page) == "number", cast(_chunk_value("page_number"), Numeric)),
        )
        if metadata.page_from is not None:
            conditions.append(page >= metadata.page_from)
        if metadata.page_to is not None:
            conditions.append(page <= metadata.page_to)
    return conditions


async def _enable_iterative_scan(db: AsyncSession) -> None:
    version = await db.scalar(text("SELECT extversion FROM pg_extension WHERE extname = 'vector'"))
    match = re.match(r"^(\d+)\.(\d+)", version or "")
    if match is None or tuple(map(int, match.groups())) < (0, 8):
        raise VectorSearchUnavailable("iterative_scan_requires_pgvector_0_8")
    await db.execute(text("SET LOCAL hnsw.iterative_scan = strict_order"))


class RagSearchRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def pgvector_is_available(self) -> bool:
        return await check_pgvector_is_available(self.db)

    def _retrieval_scope_filters(
        self,
        scope: RetrievalScope,
    ) -> list[ColumnElement[bool]] | None:
        """Build shared WHERE clauses. Returns None when empty allow-list (I1)."""
        from backend.modules.rag.application.document_scope import (
            document_ids_is_empty_allow_list,
            should_apply_document_id_filter,
        )

        document_ids = list(scope.document_ids) if scope.document_ids is not None else None
        if document_ids_is_empty_allow_list(document_ids):
            return None

        filters = [RagDocument.status == "indexed", RagDocument.deleted_at.is_(None)]
        if scope.index_revision_ids is None:
            filters.append(
                or_(
                    RagDocument.current_revision_id == RagChunk.revision_id,
                    and_(
                        RagDocument.current_revision_id.is_(None),
                        RagChunk.revision_id.is_(None),
                    ),
                )
            )
        elif not scope.index_revision_ids:
            return None
        else:
            filters.append(RagChunk.revision_id.in_(scope.index_revision_ids))
        if scope.owner_scoped:
            filters.append(
                and_(
                    RagChunk.user_id == scope.user_id,
                    RagDocument.user_id == scope.user_id,
                    or_(
                        RagDocument.project_id.is_(None),
                        RagDocument.project_id.in_(
                            select(ProjectMember.project_id).where(
                                ProjectMember.user_id == scope.user_id
                            )
                        ),
                    ),
                )
            )
        if scope.project_id:
            filters.append(RagChunk.project_id == scope.project_id)
        if should_apply_document_id_filter(document_ids):
            filters.append(RagChunk.document_id.in_(document_ids or []))
        if scope.metadata is not None:
            filters.extend(_metadata_conditions(scope.metadata))
        if scope.exclude_parents:
            # Parents use negative chunk_index and/or chunk_role=parent metadata.
            filters.append(
                and_(
                    RagChunk.chunk_index >= 0,
                    or_(
                        RagChunk.metadata_json.is_(None),
                        func.coalesce(
                            cast(RagChunk.metadata_json, JSON).op("->>")("chunk_role"),
                            "child",
                        )
                        != "parent",
                    ),
                )
            )
        return filters

    async def similarity_search_indexed(
        self,
        *,
        scope: RetrievalScope,
        query_embedding: list[float],
        top_k: int,
        score_threshold: float,
        iterative_scan: bool = False,
    ) -> list[RetrievedChunk] | None:
        if not is_valid_embedding(query_embedding) or not any(query_embedding):
            raise InvalidQueryEmbedding("invalid_query_embedding")
        filters = self._retrieval_scope_filters(scope)
        if filters is None:
            return []
        if not embedding_is_indexable(query_embedding):
            raise InvalidQueryEmbedding("embedding_dimension_mismatch")
        if not await check_pgvector_is_available(self.db):
            return None

        params = {
            "query_vec": vector_literal(query_embedding),
            "score_threshold": score_threshold,
            "top_k": top_k,
        }
        query_vector = cast(bindparam("query_vec"), RagChunk.embedding.type)
        distance = RagChunk.embedding.op("<=>")(query_vector)
        score = 1 - distance
        statement = (
            select(
                RagChunk.id.label("chunk_id"),
                RagChunk.document_id,
                RagChunk.content,
                RagChunk.chunk_index,
                RagChunk.metadata_json,
                RagChunk.revision_id,
                RagDocument.original_filename,
                score.label("score"),
            )
            .join(RagDocument, RagDocument.id == RagChunk.document_id)
            .where(
                *filters,
                RagChunk.embedding.is_not(None),
                score >= bindparam("score_threshold"),
            )
            .order_by(distance)
            .limit(bindparam("top_k"))
        )
        try:
            if iterative_scan:
                await _enable_iterative_scan(self.db)
            result = await self.db.execute(statement, params)
        except SQLAlchemyError as exc:
            raise VectorSearchUnavailable("indexed_search_failed") from exc

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
        scope: RetrievalScope,
        query_embedding: list[float],
        top_k: int,
        score_threshold: float,
        exact_max_rows: int | None = None,
    ) -> list[RetrievedChunk]:
        if not is_valid_embedding(query_embedding) or not any(query_embedding):
            raise InvalidQueryEmbedding("invalid_query_embedding")
        if not embedding_is_indexable(query_embedding):
            raise InvalidQueryEmbedding("embedding_dimension_mismatch")
        filters = self._retrieval_scope_filters(scope)
        if filters is None:
            return []

        requested_max_rows = (
            exact_max_rows if exact_max_rows is not None else MAX_JSON_FALLBACK_ROWS
        )
        max_rows = min(MAX_JSON_FALLBACK_ROWS, max(0, int(requested_max_rows)))
        if max_rows < 1:
            raise DenseFallbackScopeTooLarge("json_fallback_disabled")

        statement = (
            select(
                RagChunk.id.label("chunk_id"),
                RagChunk.document_id,
                RagChunk.content,
                RagChunk.chunk_index,
                RagChunk.metadata_json,
                RagChunk.revision_id,
                RagChunk.embedding_json,
                RagDocument.original_filename,
            )
            .join(RagDocument, RagDocument.id == RagChunk.document_id)
            .where(*filters, RagChunk.embedding_json.is_not(None))
            .order_by(RagChunk.document_id, RagChunk.chunk_index, RagChunk.id)
            .limit(max_rows + 1)
        )
        try:
            result = await self.db.execute(statement)
        except SQLAlchemyError as exc:
            raise VectorSearchUnavailable("json_fallback_failed") from exc
        raw_rows = result.mappings().all()
        if len(raw_rows) > max_rows:
            raise DenseFallbackScopeTooLarge(f"pgvector_required_for_scope_size:>{max_rows}")
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
            for row in raw_rows
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
        scope: RetrievalScope,
        query: str,
        top_k: int,
        phrase_boost: bool = False,
    ) -> list[RetrievedChunk]:
        """Independent PostgreSQL full-text lexical ranking path."""
        filters = self._retrieval_scope_filters(scope)
        if filters is None:
            return []

        # A document's declared language uses its PostgreSQL stemmer where
        # available; every document is additionally searched with ``simple``.
        # Unknown languages and mixed corpora retain the simple-token fallback.
        query_value = bindparam("query")
        language_config = cast(
            case(POSTGRES_TEXT_SEARCH_CONFIGS, value=_language_code(), else_="simple"),
            REGCONFIG(),
        )
        simple_config = literal("simple", type_=REGCONFIG())
        scoped_chunks = (
            select(
                RagChunk.id.label("chunk_id"),
                RagChunk.document_id,
                RagChunk.content,
                RagChunk.chunk_index,
                RagChunk.metadata_json,
                RagChunk.revision_id,
                RagDocument.original_filename,
                language_config.label("language_config"),
                _chunk_value("section_heading").label("section_heading"),
                func.coalesce(
                    RagChunk.content_tsv,
                    func.to_tsvector(simple_config, func.coalesce(RagChunk.content, "")),
                ).label("simple_vector"),
            )
            .join(RagDocument, RagDocument.id == RagChunk.document_id)
            .where(*filters)
            .cte("scoped_chunks")
        )
        language_vector = func.to_tsvector(
            scoped_chunks.c.language_config,
            func.coalesce(scoped_chunks.c.content, ""),
        )
        language_query = func.plainto_tsquery(scoped_chunks.c.language_config, query_value)
        simple_query = func.plainto_tsquery(simple_config, query_value)
        language_match = language_vector.op("@@")(language_query)
        simple_match = scoped_chunks.c.simple_vector.op("@@")(simple_query)
        score = func.greatest(
            func.ts_rank_cd(language_vector, language_query),
            func.ts_rank_cd(scoped_chunks.c.simple_vector, simple_query),
        )
        matches = or_(language_match, simple_match)
        params = {"query": query, "top_k": top_k}
        if phrase_boost:
            phrase = bindparam("phrase")
            phrase_match = or_(
                language_vector.op("@@")(
                    func.phraseto_tsquery(scoped_chunks.c.language_config, phrase)
                ),
                scoped_chunks.c.simple_vector.op("@@")(
                    func.phraseto_tsquery(simple_config, phrase)
                ),
            )
            matches = or_(matches, phrase_match)
            score = score + case((phrase_match, 1), else_=0)
            params["phrase"] = quoted_phrase(query) or query
        if identifier := exact_identifier(query):
            id_query = func.plainto_tsquery(simple_config, bindparam("identifier"))
            exact_match = and_(
                scoped_chunks.c.simple_vector.op("@@")(id_query),
                scoped_chunks.c.content.op("~*")(bindparam("identifier_pattern")),
            )
            matches = or_(matches, exact_match)
            score = score + case((exact_match, 1), else_=0)
            params.update(identifier=identifier, identifier_pattern=rf"\m{re.escape(identifier)}\M")
        heading_vector = func.to_tsvector(
            simple_config, func.coalesce(scoped_chunks.c.section_heading, "")
        )
        score = score + func.ts_rank_cd(heading_vector, simple_query)
        statement = (
            select(*scoped_chunks.c, score.label("score"))
            .where(matches)
            .order_by(score.desc(), scoped_chunks.c.chunk_id)
            .limit(bindparam("top_k"))
        )
        try:
            result = await self.db.execute(statement, params)
        except SQLAlchemyError as exc:
            raise VectorSearchUnavailable("lexical_search_failed") from exc

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
