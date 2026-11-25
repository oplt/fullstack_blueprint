"""Persistence and lifecycle service for alternate embedding indexes."""

from __future__ import annotations

import hashlib
import re
from collections.abc import Awaitable, Callable, Sequence
from datetime import UTC, datetime

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.rag.application.embedding_registry import (
    EmbeddingModelSpec,
    IndexLifecycle,
)
from backend.modules.rag.infrastructure.models import (
    RagChunk,
    RagChunkEmbedding,
    RagEmbeddingModel,
    RagIndexVersion,
)

Embedder = Callable[[list[str]], Awaitable[list[list[float]]]]


class EmbeddingIndexService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def register_model(self, spec: EmbeddingModelSpec) -> RagEmbeddingModel:
        row = RagEmbeddingModel(
            key=spec.key,
            provider=spec.provider,
            model=spec.model,
            model_version=spec.model_version,
            dimensions=spec.dimensions,
            distance_metric=spec.distance_metric,
            normalized=spec.normalized,
            chunking_config_json=spec.chunking_config,
            index_version=spec.index_version,
            cost_per_million_tokens_micros=spec.cost_per_million_tokens_micros,
        )
        self.db.add(row)
        await self.db.flush()
        return row

    async def begin_index(self, *, key: str, model: RagEmbeddingModel) -> RagIndexVersion:
        result = await self.db.execute(
            select(RagIndexVersion.generation)
            .where(RagIndexVersion.key == key)
            .order_by(RagIndexVersion.generation.desc())
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

    async def embed_chunks(
        self,
        index: RagIndexVersion,
        model: RagEmbeddingModel,
        chunks: Sequence[RagChunk],
        embedder: Embedder,
        *,
        batch_size: int = 32,
    ) -> int:
        count = 0
        for start in range(0, len(chunks), max(1, batch_size)):
            batch = list(chunks[start : start + max(1, batch_size)])
            unique_chunks: list[RagChunk] = []
            by_hash: dict[str, list[RagChunk]] = {}
            for chunk in batch:
                content_hash = (
                    chunk.content_hash or hashlib.sha256(chunk.content.encode("utf-8")).hexdigest()
                )
                if content_hash not in by_hash:
                    unique_chunks.append(chunk)
                by_hash.setdefault(content_hash, []).append(chunk)
            vectors = await embedder([chunk.content for chunk in unique_chunks])
            if len(vectors) != len(unique_chunks):
                raise ValueError("embedding provider returned an incomplete batch")
            vectors_by_hash = {
                chunk.content_hash
                or hashlib.sha256(chunk.content.encode("utf-8")).hexdigest(): vector
                for chunk, vector in zip(unique_chunks, vectors, strict=True)
            }
            for chunk in batch:
                content_hash = (
                    chunk.content_hash or hashlib.sha256(chunk.content.encode("utf-8")).hexdigest()
                )
                vector = vectors_by_hash[content_hash]
                if len(vector) != model.dimensions:
                    raise ValueError(
                        f"embedding dimensions for {model.key} must be {model.dimensions}"
                    )
                self.db.add(
                    RagChunkEmbedding(
                        chunk_id=chunk.id,
                        embedding_model_id=model.id,
                        index_version_id=index.id,
                        dimensions=model.dimensions,
                        embedding=vector,
                        content_hash=content_hash,
                    )
                )
                count += 1
        index.vector_count = count
        index.document_count = len({chunk.document_id for chunk in chunks})
        await self.db.flush()
        return count

    async def activate(self, index: RagIndexVersion) -> None:
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

    async def ensure_ann_index(self, *, index: RagIndexVersion, model: RagEmbeddingModel) -> None:
        """Create a dimension-specific partial HNSW index for one generation.

        The variable-dimension table deliberately has no global vector index:
        pgvector indexes require a fixed dimension. Each generation therefore
        owns a filtered expression index, created only after its vectors exist.
        """
        safe_index_id = "".join(character for character in index.id if character.isalnum())
        safe_model_id = "".join(character for character in model.id if character.isalnum())
        if (
            not safe_index_id
            or not safe_model_id
            or not re.fullmatch(r"[A-Za-z0-9_-]+", index.id)
            or not re.fullmatch(r"[A-Za-z0-9_-]+", model.id)
        ):
            raise ValueError("embedding index identifiers must be non-empty")
        operator = {
            "cosine": "vector_cosine_ops",
            "dot": "vector_ip_ops",
            "euclidean": "vector_l2_ops",
        }.get(model.distance_metric)
        if operator is None:
            raise ValueError(f"unsupported vector distance metric: {model.distance_metric}")
        await self.db.execute(
            text(
                "CREATE INDEX IF NOT EXISTS "
                f"ix_rag_chunk_embeddings_hnsw_{safe_index_id} "
                "ON rag_chunk_embeddings USING hnsw "
                f"((embedding::vector({model.dimensions})) {operator}) "
                "WHERE embedding_model_id = "
                f"'{model.id}' AND index_version_id = '{index.id}'"
            )
        )

    async def rollback(self, *, key: str, generation: int) -> RagIndexVersion:
        result = await self.db.execute(
            select(RagIndexVersion).where(
                RagIndexVersion.key == key,
                RagIndexVersion.generation == generation,
            )
        )
        target = result.scalar_one()
        await self.activate(target)
        target.rolled_back_at = datetime.now(UTC)
        return target

    async def estimate_cost(self, *, model: RagEmbeddingModel, token_count: int) -> int:
        return int(token_count * model.cost_per_million_tokens_micros / 1_000_000)
