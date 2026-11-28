import json

from backend.tests.rag.retrieval_eval import (
    FIXTURES,
    evaluate_case,
    evaluate_ranking,
    run_benchmark,
)


def _case(case_id: str) -> dict:
    payload = json.loads(FIXTURES.read_text())
    return next(case for case in payload["cases"] if case["id"] == case_id)


def test_no_evidence_abstention_is_not_an_unsupported_claim() -> None:
    result = evaluate_case(_case("no-evidence"))

    assert result["citation"]["unsupported_claim_rate"] == 0.0
    assert result["citation"]["citation_precision"] == 1.0
    assert result["citation"]["citation_recall"] == 1.0


def test_supported_fixture_citation_uses_current_answer_contract() -> None:
    result = evaluate_case(_case("activation-framing"))

    assert result["citation"]["structural_validity"] == 1.0
    assert result["citation"]["citation_precision"] == 1.0
    assert result["citation"]["citation_recall"] == 0.5
    assert result["citation"]["unsupported_claim_rate"] == 0.0


def test_ranking_metrics_include_fixed_cutoffs() -> None:
    metrics = evaluate_ranking(["relevant", "noise"], {"relevant"})

    assert metrics.precision_at_5 == 0.2
    assert metrics.precision_at_10 == 0.1
    assert metrics.recall_at_20 == 1.0
    assert metrics.mrr_at_10 == 1.0


def test_benchmark_aggregates_fixed_cutoff_metrics() -> None:
    ranking = run_benchmark()["ranking"]["rrf_hybrid"]

    assert ranking["precision_at_5"] == 0.26153846153846155
    assert ranking["recall_at_20"] == 0.9230769230769231
    assert ranking["mrr_at_10"] == 0.9230769230769231
