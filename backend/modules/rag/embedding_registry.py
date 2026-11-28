"""Versioned embedding contracts and non-destructive index lifecycle rules."""

from __future__ import annotations

import json
from dataclasses import dataclass
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field

from backend.core.config import settings


class IndexLifecycle(StrEnum):
    BUILDING = "building"
    ACTIVE = "active"
    RETIRED = "retired"
    ROLLED_BACK = "rolled_back"


class EmbeddingModelSpec(BaseModel):
    key: str = Field(min_length=1, max_length=160)
    provider: str = Field(min_length=1, max_length=128)
    model: str = Field(min_length=1, max_length=255)
    model_version: str = Field(default="default", min_length=1, max_length=128)
    dimensions: int = Field(gt=0, le=65_535)
    distance_metric: str = Field(default="cosine", pattern="^(cosine|dot|euclidean)$")
    normalized: bool = False
    chunking_config: dict[str, Any] = Field(default_factory=dict)
    index_version: str = Field(min_length=1, max_length=128)
    cost_per_million_tokens_micros: int = Field(default=0, ge=0)

    def fingerprint(self) -> str:
        payload = self.model_dump(mode="json")
        return json.dumps(payload, sort_keys=True, separators=(",", ":"))


@dataclass(frozen=True, slots=True)
class IndexSwitch:
    previous_index: str | None
    active_index: str
    rollback_available: bool


class EmbeddingModelRegistry:
    """In-process registry used by ingestion, reindexing and health checks.

    Registry entries are immutable contracts. Switching an index only changes
    the active pointer; old vectors remain available for rollback and audit.
    """

    def __init__(self, specs: list[EmbeddingModelSpec] | None = None) -> None:
        resolved = specs if specs is not None else self._from_settings()
        self._specs = {spec.key: spec for spec in resolved}
        if len(self._specs) != len(resolved):
            raise ValueError("Embedding model keys must be unique")
        self._active_key = self._specs[next(iter(self._specs))].key if self._specs else None

    @staticmethod
    def _from_settings() -> list[EmbeddingModelSpec]:
        raw = settings.RAG_EMBEDDING_REGISTRY_JSON.strip()
        if raw:
            payload = json.loads(raw)
            return [EmbeddingModelSpec.model_validate(item) for item in payload]
        provider = settings.RAG_EMBEDDING_PROVIDER.strip() or settings.AI_EMBEDDING_PROVIDER
        return [
            EmbeddingModelSpec(
                key=(
                    f"{provider}:{settings.RAG_EMBEDDING_MODEL}:"
                    f"{settings.RAG_EMBEDDING_MODEL_VERSION or 'default'}"
                ),
                provider=provider,
                model=settings.RAG_EMBEDDING_MODEL,
                model_version=settings.RAG_EMBEDDING_MODEL_VERSION or "default",
                dimensions=settings.RAG_EMBEDDING_DIMENSIONS,
                normalized=False,
                chunking_config={
                    "chunk_size": settings.RAG_CHUNK_SIZE,
                    "chunk_overlap": settings.RAG_CHUNK_OVERLAP,
                    "chunk_policy_version": settings.RAG_CHUNK_POLICY_VERSION,
                },
                index_version=settings.RAG_INDEX_VERSION,
            )
        ]

    def all(self) -> tuple[EmbeddingModelSpec, ...]:
        return tuple(self._specs.values())

    def get(self, key: str) -> EmbeddingModelSpec:
        try:
            return self._specs[key]
        except KeyError as exc:
            raise KeyError(f"Unknown embedding model: {key}") from exc

    @property
    def active(self) -> EmbeddingModelSpec:
        if self._active_key is None:
            raise RuntimeError("No embedding model is registered")
        return self.get(self._active_key)

    def register(self, spec: EmbeddingModelSpec) -> None:
        if spec.key in self._specs:
            raise ValueError(f"Embedding model already registered: {spec.key}")
        self._specs[spec.key] = spec

    def switch(self, key: str, *, lifecycle: IndexLifecycle = IndexLifecycle.ACTIVE) -> IndexSwitch:
        if lifecycle != IndexLifecycle.ACTIVE:
            raise ValueError("Only a built index can become active")
        self.get(key)
        previous = self._active_key
        self._active_key = key
        return IndexSwitch(
            previous_index=previous,
            active_index=key,
            rollback_available=previous is not None and previous != key,
        )

    def rollback(self, key: str | None = None) -> IndexSwitch:
        target = key or self._active_key
        if target is None:
            raise RuntimeError("No active embedding index exists")
        self.get(target)
        previous = self._active_key
        if key is None:
            raise ValueError("Rollback requires the previous index key")
        self._active_key = key
        return IndexSwitch(previous_index=previous, active_index=key, rollback_available=True)

    @staticmethod
    def validate_vector(vector: list[float], spec: EmbeddingModelSpec) -> None:
        if len(vector) != spec.dimensions:
            raise ValueError(
                f"Embedding dimension mismatch for {spec.key}: "
                f"expected {spec.dimensions}, got {len(vector)}"
            )


def build_embedding_registry() -> EmbeddingModelRegistry:
    return EmbeddingModelRegistry()
