from __future__ import annotations

import json
from weakref import WeakKeyDictionary, WeakSet, ref

from sqlalchemy import Table, bindparam, cast, event, text, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import settings
from backend.lib.vectors import (
    can_index_embedding,
    cosine_similarity,
    is_valid_embedding,
    vector_literal,
)


class VectorSearchUnavailable(RuntimeError):
    """Database search failed; this is not a capability miss or empty result."""


class InvalidQueryEmbedding(ValueError):
    """Query embedding cannot safely be compared with stored vectors."""


_PGVECTOR_CAPABILITY: WeakKeyDictionary[object, bool] = WeakKeyDictionary()
_PGVECTOR_POOLS: WeakKeyDictionary[object, object] = WeakKeyDictionary()
_PGVECTOR_LISTENED_POOLS: WeakSet[object] = WeakSet()


def invalidate_pgvector_capability(engine: object | None = None) -> None:
    """Clear cached extension capability after a migration or engine reconfiguration."""
    if engine is None:
        _PGVECTOR_CAPABILITY.clear()
    else:
        _PGVECTOR_CAPABILITY.pop(engine, None)


def _prepare_pgvector_capability_cache(engine: object) -> bool:
    sync_engine = getattr(engine, "sync_engine", engine)
    if getattr(getattr(sync_engine, "dialect", None), "name", None) != "postgresql":
        return False
    pool = getattr(sync_engine, "pool", None)
    if pool is None:
        return True
    if _PGVECTOR_POOLS.get(engine) is not pool:
        _PGVECTOR_CAPABILITY.pop(engine, None)
        _PGVECTOR_POOLS[engine] = pool
    if pool not in _PGVECTOR_LISTENED_POOLS:
        engine_ref = ref(engine)

        def invalidate_on_reconnect(_connection, _record, _exception) -> None:
            cached_engine = engine_ref()
            if cached_engine is not None:
                _PGVECTOR_CAPABILITY.pop(cached_engine, None)

        event.listen(pool, "invalidate", invalidate_on_reconnect)
        _PGVECTOR_LISTENED_POOLS.add(pool)
    return True


class DenseFallbackScopeTooLarge(RuntimeError):
    """JSON vectors cannot provide exact retrieval for this eligible scope."""


MAX_JSON_FALLBACK_ROWS = 5000


def json_fallback_max_candidates(top_k: int) -> int:
    return min(MAX_JSON_FALLBACK_ROWS, max(250, top_k * 50))


def rank_embedding_matches(
    query_embedding: list[float],
    rows: list[dict],
    *,
    top_k: int,
    score_threshold: float,
    build_match,
) -> list:
    if not is_valid_embedding(query_embedding) or not any(query_embedding):
        raise InvalidQueryEmbedding("invalid_query_embedding")
    scored: list[tuple[float, dict]] = []
    for row in rows:
        embedding = row.get("embedding")
        if not isinstance(embedding, list) or not can_index_embedding(
            embedding, expected_dimensions=len(query_embedding)
        ):
            continue
        if not any(embedding):
            continue
        score = cosine_similarity(query_embedding, embedding)
        if score >= score_threshold:
            scored.append((score, row))
    scored.sort(key=lambda item: item[0], reverse=True)
    return [build_match(row, score) for score, row in scored[:top_k]]


def parse_embedding_json(raw: str | list[float] | None) -> list[float]:
    if not raw:
        return []
    if isinstance(raw, list):
        return raw
    try:
        parsed = json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        return []
    return parsed if isinstance(parsed, list) else []


def embedding_is_indexable(
    embedding: list[float],
    *,
    expected_dimensions: int | None = None,
) -> bool:
    return can_index_embedding(
        embedding,
        expected_dimensions=expected_dimensions or settings.RAG_EMBEDDING_DIMENSIONS,
    )


async def pgvector_is_available(db: AsyncSession) -> bool:
    """Check whether PostgreSQL has pgvector, caching stable engine capability."""
    engine = getattr(db, "bind", None)
    if engine is not None:
        if not _prepare_pgvector_capability_cache(engine):
            return False
        cached = _PGVECTOR_CAPABILITY.get(engine)
        if cached is not None:
            return cached
    try:
        result = await db.execute(
            text("SELECT 1 FROM pg_extension WHERE extname = 'vector' LIMIT 1")
        )
    except SQLAlchemyError as exc:
        raise VectorSearchUnavailable("pgvector_capability_check_failed") from exc
    available = result.scalar() is not None
    if engine is not None:
        _PGVECTOR_CAPABILITY[engine] = available
    return available


async def store_chunk_embeddings_batch(
    db: AsyncSession,
    *,
    table: Table,
    items: list[tuple[str, list[float]]],
) -> None:
    if not items:
        return
    if not await pgvector_is_available(db):
        return

    indexable = [
        (chunk_id, embedding) for chunk_id, embedding in items if embedding_is_indexable(embedding)
    ]
    if not indexable:
        return

    statement = (
        update(table)
        .where(table.c.id == bindparam("chunk_id"))
        .values(embedding=cast(bindparam("embedding"), table.c.embedding.type))
    )
    await db.execute(
        statement,
        [
            {"embedding": vector_literal(embedding), "chunk_id": chunk_id}
            for chunk_id, embedding in indexable
        ],
    )
