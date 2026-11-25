from unittest.mock import AsyncMock, MagicMock

import pytest
from backend.api.main import app
from backend.core.config import settings
from backend.core.pagination import decode_cursor, encode_cursor
from backend.modules.capabilities import CAPABILITY_REGISTRY
from backend.modules.events.domain import DomainEvent
from backend.modules.events.models import OutboxEvent
from backend.modules.events.repository import OutboxRepository
from fastapi.testclient import TestClient


def test_problem_details_preserve_legacy_detail_and_add_rfc_fields() -> None:
    response = TestClient(app).post("/api/v1/auth/sign-in", json={})

    assert response.status_code == 422
    payload = response.json()
    assert payload["detail"] == "Request validation failed"
    assert payload["type"].endswith("/422")
    assert payload["status"] == 422
    assert payload["correlation_id"]
    assert response.headers["content-type"].startswith("application/problem+json")


def test_capability_registry_separates_deployment_and_runtime_state(monkeypatch) -> None:
    monkeypatch.setattr(settings, "AI_ENABLED", False)
    manifest = CAPABILITY_REGISTRY.manifest(settings, runtime_enabled={"projects"})
    ai = next(item for item in manifest if item.identifier == "ai")
    projects = next(item for item in manifest if item.identifier == "projects")

    assert ai.deployment_enabled is False
    assert ai.runtime_enabled is False
    assert projects.deployment_enabled is True
    assert projects.runtime_enabled is True


def test_cursor_encoding_is_url_safe() -> None:
    value = "created-at:2026-11-24T19:50:00+00:00"
    assert decode_cursor(encode_cursor(value)) == value


@pytest.mark.asyncio
async def test_outbox_enqueue_is_transaction_local_and_dead_letters_after_retries() -> None:
    db = MagicMock()
    db.scalar = AsyncMock()
    db.flush = AsyncMock()
    repository = OutboxRepository(db)
    event = DomainEvent(
        event_type="platform.noop.v1",
        aggregate_type="test",
        aggregate_id="aggregate-1",
        producer="test",
        dedupe_key="test:aggregate-1",
    )

    db.scalar.return_value = None
    row = await repository.enqueue(event)
    assert isinstance(row, OutboxEvent)
    db.add.assert_called_once_with(row)
    db.flush.assert_awaited_once()

    row.attempts = 10
    await repository.mark_failed(row, error="permanent failure", max_attempts=10)
    assert row.status == "dead_letter"
    assert row.last_error == "permanent failure"
