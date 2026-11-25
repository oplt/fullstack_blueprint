"""Opt-in model comparison matrix; it never changes production defaults."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ModelBenchmarkCandidate:
    key: str
    kind: str
    provider: str
    dimensions: int | None
    multilingual: bool
    default_enabled: bool = False


MODEL_BENCHMARK_MATRIX: tuple[ModelBenchmarkCandidate, ...] = (
    ModelBenchmarkCandidate(
        key="configured-default",
        kind="embedding",
        provider="configured",
        dimensions=None,
        multilingual=False,
        default_enabled=True,
    ),
    ModelBenchmarkCandidate(
        key="BAAI/bge-m3",
        kind="embedding",
        provider="huggingface",
        dimensions=1024,
        multilingual=True,
    ),
    ModelBenchmarkCandidate(
        key="intfloat/multilingual-e5-large",
        kind="embedding",
        provider="huggingface",
        dimensions=1024,
        multilingual=True,
    ),
    ModelBenchmarkCandidate(
        key="BAAI/bge-reranker-v2-m3",
        kind="reranker",
        provider="huggingface",
        dimensions=None,
        multilingual=True,
    ),
)


def benchmark_matrix() -> tuple[ModelBenchmarkCandidate, ...]:
    """Return candidates for an isolated fixture run, not live configuration."""

    return MODEL_BENCHMARK_MATRIX


def production_default_is_unchanged() -> bool:
    return sum(candidate.default_enabled for candidate in MODEL_BENCHMARK_MATRIX) == 1
