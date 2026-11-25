"""Deterministic retrieval and grounded-answer benchmark metrics."""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class RetrievalMetricReport:
    recall_at_k: float
    precision_at_k: float
    mrr: float
    ndcg: float
    citation_accuracy: float
    answer_faithfulness: float
    retrieval_latency_ms: float
    cost_per_query_micros: int
    tenant_isolation_passed: bool


def recall_at_k(predicted: list[str], relevant: set[str], k: int) -> float:
    if not relevant:
        return 1.0
    return len(set(predicted[:k]) & relevant) / len(relevant)


def precision_at_k(predicted: list[str], relevant: set[str], k: int) -> float:
    selected = predicted[:k]
    return (len(set(selected) & relevant) / len(selected)) if selected else 0.0


def reciprocal_rank(predicted: list[str], relevant: set[str], k: int) -> float:
    for rank, item in enumerate(predicted[:k], start=1):
        if item in relevant:
            return 1.0 / rank
    return 0.0


def ndcg_at_k(predicted: list[str], relevance: dict[str, float], k: int) -> float:
    def dcg(items: list[str]) -> float:
        return sum(
            (2 ** relevance.get(item, 0.0) - 1) / math.log2(rank + 1)
            for rank, item in enumerate(items, start=1)
        )

    actual = dcg(predicted[:k])
    ideal = dcg(sorted(relevance, key=relevance.get, reverse=True)[:k])
    return actual / ideal if ideal else 1.0


def citation_accuracy(cited_ids: set[str], supported_ids: set[str]) -> float:
    if not cited_ids:
        return 1.0 if not supported_ids else 0.0
    return len(cited_ids & supported_ids) / len(cited_ids)


def answer_faithfulness(claim_support: dict[str, bool]) -> float:
    if not claim_support:
        return 1.0
    return sum(claim_support.values()) / len(claim_support)


def tenant_isolation_check(rows: list[dict[str, Any]], tenant_id: str) -> bool:
    return all(row.get("tenant_id") == tenant_id for row in rows)


def build_report(
    *,
    predicted: list[str],
    relevant: set[str],
    graded_relevance: dict[str, float] | None = None,
    k: int = 5,
    cited_ids: set[str] | None = None,
    supported_ids: set[str] | None = None,
    claim_support: dict[str, bool] | None = None,
    latency_ms: float = 0.0,
    cost_micros: int = 0,
    result_rows: list[dict[str, Any]] | None = None,
    tenant_id: str = "",
) -> RetrievalMetricReport:
    return RetrievalMetricReport(
        recall_at_k=recall_at_k(predicted, relevant, k),
        precision_at_k=precision_at_k(predicted, relevant, k),
        mrr=reciprocal_rank(predicted, relevant, k),
        ndcg=ndcg_at_k(predicted, graded_relevance or {item: 1.0 for item in relevant}, k),
        citation_accuracy=citation_accuracy(cited_ids or set(), supported_ids or set()),
        answer_faithfulness=answer_faithfulness(claim_support or {}),
        retrieval_latency_ms=latency_ms,
        cost_per_query_micros=cost_micros,
        tenant_isolation_passed=tenant_isolation_check(result_rows or [], tenant_id),
    )
