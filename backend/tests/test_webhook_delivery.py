from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import AsyncMock, Mock

import pytest
from sqlalchemy.dialects import postgresql

from backend.modules.admin.platform.models import WebhookDelivery
from backend.modules.integrations.webhook_jobs import (
    StaleWebhookAttemptError,
    WebhookDeliveryService,
    sign_webhook_payload,
    verify_webhook_signature,
)


def _delivery(**overrides) -> WebhookDelivery:
    fields = {
        "webhook_id": "hook-1",
        "event_id": "event-1",
        "event_version": "v1",
        "payload_json": {"event": "created"},
        "status": "pending",
        "attempt_count": 0,
        "next_attempt_at": None,
    }
    fields.update(overrides)
    return WebhookDelivery(**fields)


@pytest.mark.asyncio
async def test_enqueue_uses_unique_constraint_conflict_handling_for_duplicates() -> None:
    db = AsyncMock()
    insert_result = Mock()
    insert_result.scalar_one_or_none.return_value = None
    db.execute.return_value = insert_result
    existing = _delivery(status="delivered")
    db.scalar.return_value = existing

    result = await WebhookDeliveryService(db).enqueue(
        webhook_id="hook-1", event_id="event-1", payload={"event": "created"}
    )

    assert result is existing
    statement = db.execute.await_args.args[0]
    sql = str(statement.compile(dialect=postgresql.dialect()))
    assert "ON CONSTRAINT uq_webhook_delivery_event DO NOTHING" in sql
    db.add.assert_not_called()


@pytest.mark.asyncio
async def test_claim_batch_uses_skip_locked_and_sets_lease_and_fencing_attempt() -> None:
    db = AsyncMock()
    claimed = _delivery(attempt_count=2)
    update_result = Mock()
    select_result = Mock()
    select_result.scalars.return_value.all.return_value = [claimed]
    db.execute.side_effect = [update_result, select_result]

    rows = await WebhookDeliveryService(db).claim_batch(limit=3, lease_seconds=60)

    assert rows == [claimed]
    assert claimed.status == "processing"
    assert claimed.attempt_count == 3
    assert claimed.next_attempt_at > datetime.now(UTC)
    statement = db.execute.await_args_list[1].args[0]
    sql = str(statement.compile(dialect=postgresql.dialect()))
    assert "FOR UPDATE SKIP LOCKED" in sql
    assert "coalesce(webhook_deliveries.next_attempt_at, webhook_deliveries.created_at)" in sql


@pytest.mark.asyncio
async def test_mark_attempt_rejects_stale_claim_and_dead_letters_at_attempt_limit() -> None:
    db = AsyncMock()
    failed_attempt = Mock()
    failed_attempt.scalar_one_or_none.return_value = None
    db.execute.return_value = failed_attempt
    stale = _delivery(status="processing", attempt_count=4)

    with pytest.raises(StaleWebhookAttemptError):
        await WebhookDeliveryService(db).mark_attempt(stale, error="late response")

    dead_letter = _delivery(status="processing", attempt_count=8)
    completed_attempt = Mock()
    completed_attempt.scalar_one_or_none.return_value = dead_letter
    db.execute.return_value = completed_attempt
    await WebhookDeliveryService(db).mark_attempt(dead_letter, error="failed")

    statement = db.execute.await_args.args[0]
    compiled = statement.compile(dialect=postgresql.dialect())
    sql = str(compiled)
    assert compiled.params["status"] == "dead_letter"
    assert "attempt_count" in sql
    assert "status" in sql


def test_signature_covers_exact_transmitted_bytes() -> None:
    body = b'{ "event" : "created" }'
    signature = sign_webhook_payload("secret", body, timestamp=100)

    assert verify_webhook_signature("secret", body, signature, 100, now=100)
    assert not verify_webhook_signature("secret", b'{"event":"created"}', signature, 100, now=100)


@pytest.mark.asyncio
async def test_retry_schedule_applies_bounded_jitter(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "backend.modules.integrations.webhook_jobs._retry_jitter_factor", lambda: 1.1
    )
    db = AsyncMock()
    delivery = _delivery(status="processing", attempt_count=1)
    result = Mock()
    result.scalar_one_or_none.return_value = delivery
    db.execute.return_value = result
    before = datetime.now(UTC)

    updated = await WebhookDeliveryService(db).mark_attempt(delivery, error="temporary")

    statement = db.execute.await_args.args[0]
    params = statement.compile(dialect=postgresql.dialect()).params
    delay = (params["next_attempt_at"] - before).total_seconds()
    assert updated is delivery
    assert params["status"] == "retrying"
    assert 2.0 <= delay <= 2.4
