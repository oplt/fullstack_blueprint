from unittest.mock import AsyncMock

from backend.api.main import app
from backend.api.v1 import health
from backend.core.config import settings
from backend.workers import tasks  # noqa: F401
from backend.workers.celery_app import celery_app
from fastapi.testclient import TestClient
from sqlalchemy.orm import configure_mappers


def test_models_and_openapi():
    configure_mappers()
    paths = app.openapi()["paths"]
    assert "/api/v1/auth/sign-in" in paths
    assert "/api/v1/projects" in paths
    assert "/api/v1/projects/{project_id}/tasks" in paths
    assert all(not path.startswith("/api/v1/research") for path in paths)
    if not settings.AI_ENABLED:
        assert "/api/v1/ai/overview" not in paths
    if not settings.RAG_ENABLED:
        assert "/api/v1/rag/documents" not in paths
    if not settings.MEMORY_ENABLED:
        assert "/api/v1/memory" not in paths


def test_health_reports_redis_failure(monkeypatch):
    client = TestClient(app)
    monkeypatch.setattr(health.redis_client, "ping", AsyncMock(side_effect=ConnectionError))
    assert client.get("/health/live").json() == {"status": "ok"}
    response = client.get("/health/ready")
    assert response.status_code == 503
    assert response.json()["checks"]["redis"] == "error"


def test_worker_registration():
    prefix = "backend.workers.tasks."
    assert {name.removeprefix(prefix) for name in celery_app.tasks if name.startswith(prefix)} == {
        "send_email_task",
        "index_rag_document_task",
        "cleanup_rag_document_task",
        "run_ai_evaluation_task",
        "extract_turn_memories_task",
    }


def test_email_template_renders_verification_link():
    from backend.modules.platform.email_template_service import EmailTemplateService

    result = EmailTemplateService._render_template_string(
        "{{app_name}} · {{ action_url }}",
        {"app_name": "Fullstack Blueprint", "action_url": "http://localhost/verify-email"},
    )
    assert result == "Fullstack Blueprint · http://localhost/verify-email"
