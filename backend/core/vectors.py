from __future__ import annotations

import math

from backend.core.config import settings

_FLOAT32_MAX = 3.4028234663852886e38


def estimate_tokens(text: str) -> int:
    if not text:
        return 0
    return max(1, len(text) // 4)


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b, strict=True))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


def vector_literal(vec: list[float]) -> str:
    return "[" + ",".join(f"{value:.8f}" for value in vec) + "]"


def is_valid_embedding(embedding: object) -> bool:
    """Return whether an embedding is a non-empty, finite float32 vector."""
    if not isinstance(embedding, list) or not embedding:
        return False
    return all(
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(value)
        and abs(value) <= _FLOAT32_MAX
        for value in embedding
    )


def can_index_embedding(
    embedding: list[float],
    *,
    expected_dimensions: int | None = None,
) -> bool:
    resolved_dimensions = (
        expected_dimensions
        if expected_dimensions is not None
        else settings.RAG_EMBEDDING_DIMENSIONS
    )
    return is_valid_embedding(embedding) and len(embedding) == resolved_dimensions
