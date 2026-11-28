"""Persistence and lifecycle service for alternate embedding indexes."""

from __future__ import annotations

import hashlib
import re
from collections.abc import Awaitable, Callable, Sequence
from datetime import UTC, datetime

from sqlalchemy import select, text
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.rag.embedding_registry import (
    EmbeddingModelSpec,
    IndexLifecycle,
)
from backend.modules.rag.models import (
    RagChunk,
    RagChunkEmbedding,
    RagEmbeddingModel,
    RagIndexVersion,
)

Embedder = Callable[[list[str]], Awaitable[list[list[float]]]]


# ---------------------------------------------------------------------------
# Safety primitives
# ---------------------------------------------------------------------------

# pgvector operator classes we are willing to emit into DDL. Never accept a
# value from user/model input without first passing it through this map.
_OPERATOR_CLASSES: dict[str, str] = {
    "cosine": "vector_cosine_ops",
    "dot": "vector_ip_ops",
    "euclidean": "vector_l2_ops",
}

# Identifier shape accepted for index/model IDs. Enforced before any value
# is interpolated into DDL, *in addition* to dialect-aware quoting (defence
# in depth: if the DB column type widens later, quoting still protects us).
_IDENTIFIER_RE = re.compile(r"[A-Za-z0-9_-]{1,64}")

# pgvector HNSW indexes support at most 2000 dimensions.
_PGVECTOR_HNSW_MAX_DIMENSIONS = 2000

# PostgreSQL truncates identifiers to NAMEDATALEN - 1 = 63 bytes.
_PG_MAX_IDENTIFIER_BYTES = 63

_INDEX_NAME_PREFIX = "ix_rag_chunk_embeddings_hnsw_"


def _content_hash(chunk: RagChunk) -> str:
    """Return the chunk's content hash, computing it if absent."""
    return chunk.content_hash or hashlib.sha256(chunk.content.encode("utf-8")).hexdigest()


def _coerce_dimensions(value: object, *, model_key: str) -> int:
    """Coerce ``value`` to a bounded positive int suitable for HNSW."""
    try:
        dimensions = int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError) as exc:
        raise ValueError(f"invalid vector dimensions for model {model_key!r}: {value!r}") from exc
    if not 1 <= dimensions <= _PGVECTOR_HNSW_MAX_DIMENSIONS:
        raise ValueError(
            f"vector dimensions for model {model_key!r} must be between 1 "
            f"and {_PGVECTOR_HNSW_MAX_DIMENSIONS}, got {dimensions}"
        )
    return dimensions


def _validate_identifier(value: object, *, label: str) -> str:
    if not isinstance(value, str) or not _IDENTIFIER_RE.fullmatch(value):
        raise ValueError(f"{label} must match {_IDENTIFIER_RE.pattern!r}; got {value!r}")
    return value


def _index_name_for(index_id: str) -> str:
    """Return a PostgreSQL-safe, unique HNSW index name for ``index_id``."""
    raw = f"{_INDEX_NAME_PREFIX}{index_id}"
    if len(raw.encode("utf-8")) <= _PG_MAX_IDENTIFIER_BYTES:
        return raw
    # Hash-suffix fallback keeps names under NAMEDATALEN and deterministic.
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]
    return f"{_INDEX_NAME_PREFIX}{digest}"


class EmbeddingIndexService:
    """Persistence and lifecycle orchestration for embedding indexes."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # -- model registration -------------------------------------------------

    async def register_model(self, spec: EmbeddingModelSpec) -> RagEmbeddingModel:
        if not spec.key:
            raise ValueError("embedding model key must be non-empty")
        dimensions = _coerce_dimensions(spec.dimensions, model_key=spec.key)
        if spec.distance_metric not in _OPERATOR_CLASSES:
            raise ValueError(
                f"model {spec.key!r} uses unsupported distance metric "
                f"{spec.distance_metric!r}; "
                f"expected one of {sorted(_OPERATOR_CLASSES)}"
            )
        if spec.cost_per_million_tokens_micros < 0:
            raise ValueError(
                f"model {spec.key!r} cost_per_million_tokens_micros must be non-negative"
            )
        row = RagEmbeddingModel(
            key=spec.key,
            provider=spec.provider,
            model=spec.model,
            model_version=spec.model_version,
            dimensions=dimensions,
            distance_metric=spec.distance_metric,
            normalized=spec.normalized,
            chunking_config_json=spec.chunking_config,
            index_version=spec.index_version,
            cost_per_million_tokens_micros=spec.cost_per_million_tokens_micros,
        )
        self.db.add(row)
        await self.db.flush()
        return row

    # -- index generation ---------------------------------------------------

    async def begin_index(self, *, key: str, model: RagEmbeddingModel) -> RagIndexVersion:
        # Serialise concurrent generation allocation for the same key.
        # Without this, two callers can both read MAX(generation) == N and
        # attempt to insert N+1, which either raises a UniqueViolation
        # (if a unique constraint exists) or silently corrupts the sequence.
        # ``pg_advisory_xact_lock`` releases automatically at commit/rollback.
        await self.db.execute(
            text("SELECT pg_advisory_xact_lock(hashtext(:key))"),
            {"key": key},
        )
        result = await self.db.execute(
            select(RagIndexVersion.generation)
            .where(RagIndexVersion.key == key)
            .order_by(RagIndexVersion.generation.desc())
            .limit(1)
        )
        generation = (result.scalars().first() or 0) + 1
        row = RagIndexVersion(
            key=key,
            generation=generation,
            embedding_model_id=model.id,
            status=IndexLifecycle.BUILDING.value,
        )
        self.db.add(row)
        await self.db.flush()
        return row

    # -- embedding ----------------------------------------------------------

    async def embed_chunks(
        self,
        index: RagIndexVersion,
        model: RagEmbeddingModel,
        chunks: Sequence[RagChunk],
        embedder: Embedder,
        *,
        batch_size: int = 32,
    ) -> int:
        dimensions = _coerce_dimensions(model.dimensions, model_key=model.key)
        effective_batch = max(1, batch_size)
        count = 0
        for start in range(0, len(chunks), effective_batch):
            batch = list(chunks[start : start + effective_batch])
            # Deduplicate by content hash so identical chunks cost one call.
            unique: dict[str, RagChunk] = {}
            for chunk in batch:
                unique.setdefault(_content_hash(chunk), chunk)
            vectors = await embedder([chunk.content for chunk in unique.values()])
            if len(vectors) != len(unique):
                raise ValueError(
                    "embedding provider returned an incomplete batch: "
                    f"expected {len(unique)}, got {len(vectors)}"
                )
            vectors_by_hash = dict(zip(unique.keys(), vectors, strict=True))
            for chunk in batch:
                content_hash = _content_hash(chunk)
                vector = vectors_by_hash[content_hash]
                if len(vector) != dimensions:
                    raise ValueError(
                        f"embedding dimensions for {model.key!r} must be "
                        f"{dimensions}, got {len(vector)}"
                    )
                self.db.add(
                    RagChunkEmbedding(
                        chunk_id=chunk.id,
                        embedding_model_id=model.id,
                        index_version_id=index.id,
                        dimensions=dimensions,
                        embedding=vector,
                        content_hash=content_hash,
                    )
                )
                count += 1
        index.vector_count = count
        index.document_count = len({chunk.document_id for chunk in chunks})
        await self.db.flush()
        return count

    # -- lifecycle ----------------------------------------------------------

    async def activate(
        self,
        index: RagIndexVersion,
        *,
        allow_retired: bool = False,
    ) -> None:
        if index.status == IndexLifecycle.RETIRED.value and not allow_retired:
            raise ValueError(f"cannot activate retired index {index.key}#{index.generation}")
        result = await self.db.execute(
            select(RagIndexVersion).where(
                RagIndexVersion.key == index.key,
                RagIndexVersion.status == IndexLifecycle.ACTIVE.value,
                RagIndexVersion.id != index.id,
            )
        )
        for previous in result.scalars():
            previous.status = IndexLifecycle.RETIRED.value
        index.status = IndexLifecycle.ACTIVE.value
        index.switched_at = datetime.now(UTC)
        await self.db.flush()

    async def rollback(self, *, key: str, generation: int) -> RagIndexVersion:
        result = await self.db.execute(
            select(RagIndexVersion).where(
                RagIndexVersion.key == key,
                RagIndexVersion.generation == generation,
            )
        )
        target = result.scalar_one()
        await self.activate(target, allow_retired=True)
        target.rolled_back_at = datetime.now(UTC)
        await self.db.flush()
        return target

    # -- physical index management -----------------------------------------

    async def ensure_ann_index(self, *, index: RagIndexVersion, model: RagEmbeddingModel) -> None:
        """Create a dimension-specific partial HNSW index for one generation.

        pgvector's HNSW indexes require a fixed dimension, so the shared
        variable-dimension table intentionally has no global vector index.
        Each generation therefore owns a filtered expression index, created
        only after its vectors exist.

        Operational notes
        -----------------
        * This emits blocking DDL. ``CREATE INDEX`` takes a ``SHARE`` lock
          on ``rag_chunk_embeddings`` for the duration of the build. Call
          this from an out-of-band index-management worker, *never* from a
          request-serving transaction.
        * If longer build times are acceptable, switch to
          ``CREATE INDEX CONCURRENTLY`` on a connection with
          ``isolation_level="AUTOCOMMIT"``. That is not usable through an
          ``AsyncSession`` bound to a regular transaction, so it would
          require a separate connection factory.
        * The role used here should have ``CREATE`` on the table without
          DML privileges, to bound the blast radius of any future
          regression in this method.
        """
        dimensions = _coerce_dimensions(model.dimensions, model_key=model.key)
        operator = _OPERATOR_CLASSES.get(model.distance_metric)
        if operator is None:
            raise ValueError(f"unsupported vector distance metric: {model.distance_metric!r}")
        _validate_identifier(index.id, label="index.id")
        _validate_identifier(model.id, label="model.id")

        dialect = postgresql.dialect()
        preparer = dialect.identifier_preparer

        def quote_ident(name: str) -> str:
            return preparer.quote(name)

        def quote_literal(value: str) -> str:
            # Standard SQL literal escaping. ``_IDENTIFIER_RE`` above already
            # forbids quote characters, but doubling is correct regardless
            # and keeps this safe if the regex is ever widened.
            return "'" + value.replace("'", "''") + "'"

        ddl = (
            f"CREATE INDEX IF NOT EXISTS "
            f"{quote_ident(_index_name_for(index.id))} "
            f"ON {quote_ident('rag_chunk_embeddings')} USING hnsw "
            f"(({quote_ident('embedding')}::vector({dimensions})) {operator}) "
            f"WHERE {quote_ident('embedding_model_id')} = "
            f"{quote_literal(model.id)} "
            f"AND {quote_ident('index_version_id')} = "
            f"{quote_literal(index.id)}"
        )
        await self.db.execute(text(ddl))

    # -- cost ---------------------------------------------------------------

    async def estimate_cost(self, *, model: RagEmbeddingModel, token_count: int) -> int:
        if token_count < 0:
            raise ValueError("token_count must be non-negative")
        # Integer math avoids float precision loss for large token counts.
        return (token_count * model.cost_per_million_tokens_micros) // 1_000_000
