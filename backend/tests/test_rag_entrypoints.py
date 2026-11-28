"""Smoke-test canonical RAG symbols and the offline eval/benchmark entry points."""

from __future__ import annotations

import importlib

from backend.modules.memory.policies import MemoryPolicyService as CanonicalPolicyService
from backend.modules.memory.policies import MemoryPolicyService
from backend.modules.rag.config import RagConfig
from backend.modules.rag.config import EvaluationConfig
from backend.modules.rag.domain import DocumentStatus
from backend.modules.rag.models import RagDocument
from backend.modules.rag.repository import RagRepository


def test_canonical_rag_symbols_resolve() -> None:
    assert MemoryPolicyService is CanonicalPolicyService
    assert RagConfig is not None
    assert EvaluationConfig is not None
    assert DocumentStatus is not None
    assert RagDocument is not None
    assert RagRepository is not None


def test_offline_rag_entrypoints_import() -> None:
    for module in (
        "backend.tests.rag.chunking_experiments",
        "backend.tests.rag.end_to_end_eval",
        "backend.tests.rag.live_benchmark",
        "backend.tests.rag.run_end_to_end",
        "backend.tests.rag.run_pgvector_load",
    ):
        assert importlib.import_module(module) is not None
