"""Offline claim-entailment experiment scaffold.

Disabled by default and not wired into production answer validation.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from backend.modules.rag.application.citation_validation_service import CitationValidationService
from backend.modules.rag.domain.models import RetrievedChunk

FIXTURES = Path(__file__).with_name("fixtures") / "citation_entailment_pairs.json"


def load_entailment_pairs(path: Path = FIXTURES) -> list[dict[str, Any]]:
    payload = json.loads(path.read_text())
    return list(payload.get("pairs") or [])


def lexical_entailment_score(claim: str, evidence: str) -> float:
    """Cheap lexical overlap proxy — not a production entailment model."""
    claim_tokens = {token.lower() for token in claim.split() if token.strip()}
    evidence_tokens = {token.lower() for token in evidence.split() if token.strip()}
    if not claim_tokens:
        return 1.0
    return len(claim_tokens & evidence_tokens) / len(claim_tokens)


def run_citation_entailment_experiment(
    *,
    enabled: bool = False,
    pairs: list[dict[str, Any]] | None = None,
    threshold: float = 0.35,
) -> dict[str, Any]:
    if not enabled:
        return {
            "schema_version": 1,
            "enabled": False,
            "skipped": True,
            "reason": "disabled_by_default",
            "metrics": {},
        }
    pairs = pairs if pairs is not None else load_entailment_pairs()
    scores = []
    supported = 0
    true_positive = false_positive = false_negative = 0
    validator = CitationValidationService()
    for pair in pairs:
        score = lexical_entailment_score(str(pair["claim"]), str(pair["evidence"]))
        scores.append(score)
        label = bool(pair.get("entailed", True))
        predicted = score >= threshold
        if predicted == label:
            supported += 1
        source = RetrievedChunk("source", "doc", str(pair["evidence"]), 1.0, "fixture.txt", 0)
        candidate = json.dumps(
            {
                "claims": [{"text": pair["claim"], "chunk_ids": [source.chunk_id]}],
                "no_evidence": False,
            }
        )
        exact = not validator.validate(
            raw_output=candidate, retrieved_chunks=[source]
        ).citation_validation_failed
        true_positive += int(exact and label)
        false_positive += int(exact and not label)
        false_negative += int(not exact and label)
    return {
        "schema_version": 1,
        "enabled": True,
        "skipped": False,
        "pair_count": len(pairs),
        "metrics": {
            "mean_overlap": (sum(scores) / len(scores)) if scores else 0.0,
            "agreement_rate": (supported / len(pairs)) if pairs else 1.0,
            "threshold": threshold,
            "extractive_precision": true_positive / max(1, true_positive + false_positive),
            "extractive_recall": true_positive / max(1, true_positive + false_negative),
            "extractive_false_accepts": false_positive,
        },
    }


if __name__ == "__main__":
    print(json.dumps(run_citation_entailment_experiment(enabled=True), indent=2, sort_keys=True))
