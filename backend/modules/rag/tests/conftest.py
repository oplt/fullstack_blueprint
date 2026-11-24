import pytest

from backend.core.config import settings


@pytest.fixture(autouse=True)
def enable_rag_for_module_tests(monkeypatch):
    monkeypatch.setattr(settings, "RAG_ENABLED", True)
