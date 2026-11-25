from __future__ import annotations

import unittest
import zipfile
from io import BytesIO

from backend.modules.memory.application.memory_governance import (
    evaluate_memory_governance,
    memory_content_hash,
)
from backend.modules.memory.domain.enums import MemoryLevel
from backend.modules.rag.application.embedding_registry import (
    EmbeddingModelRegistry,
    EmbeddingModelSpec,
)
from backend.modules.rag.eval.metrics import build_report
from backend.modules.rag.infrastructure.document_safety import DocumentSafetyService


class Phase07InfrastructureTests(unittest.TestCase):
    def test_embedding_registry_supports_switch_and_rollback(self) -> None:
        registry = EmbeddingModelRegistry(
            [
                EmbeddingModelSpec(
                    key="local:small:v1",
                    provider="local",
                    model="small",
                    dimensions=3,
                    index_version="pgvector-v1",
                ),
                EmbeddingModelSpec(
                    key="local:multilingual:v1",
                    provider="local",
                    model="multilingual",
                    dimensions=5,
                    index_version="pgvector-v2",
                ),
            ]
        )
        registry.switch("local:multilingual:v1")
        self.assertEqual(registry.active.dimensions, 5)
        registry.rollback("local:small:v1")
        self.assertEqual(registry.active.dimensions, 3)
        with self.assertRaises(ValueError):
            registry.validate_vector([1.0], registry.active)

    def test_document_safety_rejects_archive_path_traversal(self) -> None:
        payload = BytesIO()
        with zipfile.ZipFile(payload, "w") as archive:
            archive.writestr("../unsafe.txt", "bad")
        with self.assertRaises(ValueError):
            DocumentSafetyService.validate_container(payload.getvalue(), filename="bad.docx")

    def test_governance_adds_ttl_and_deduplicates_canonical_content(self) -> None:
        decision = evaluate_memory_governance(
            content="  User prefers dark mode. ",
            level=MemoryLevel.USER,
            confidence=0.9,
            consent_status="explicit",
            retention_days=30,
        )
        self.assertTrue(decision.allowed)
        self.assertIsNotNone(decision.expires_at)
        self.assertEqual(memory_content_hash("User prefers dark mode."), decision.content_hash)

    def test_governance_rejects_secrets_and_withdrawn_consent(self) -> None:
        secret = evaluate_memory_governance(
            content="api_key=secret-value",
            level=MemoryLevel.USER,
            confidence=1,
            consent_status="explicit",
            retention_days=30,
        )
        withdrawn = evaluate_memory_governance(
            content="User prefers tea",
            level=MemoryLevel.USER,
            confidence=1,
            consent_status="withdrawn",
            retention_days=30,
        )
        self.assertEqual(secret.reason, "sensitive_information")
        self.assertEqual(withdrawn.reason, "consent_withdrawn")

    def test_retrieval_report_is_reproducible(self) -> None:
        report = build_report(
            predicted=["a", "b", "c"],
            relevant={"b", "c"},
            graded_relevance={"b": 2.0, "c": 1.0},
            cited_ids={"b"},
            supported_ids={"b", "c"},
            claim_support={"claim-1": True, "claim-2": False},
            result_rows=[{"tenant_id": "tenant-1"}],
            tenant_id="tenant-1",
        )
        self.assertEqual(report.recall_at_k, 1.0)
        self.assertEqual(report.mrr, 0.5)
        self.assertTrue(report.tenant_isolation_passed)
