import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from backend.modules.events.domain import DomainEvent
from backend.modules.events.models import OutboxEvent
from backend.modules.events.repository import OutboxRepository


def event(*, event_id: str, dedupe_key: str = "dedupe-1") -> DomainEvent:
    return DomainEvent(
        event_id=event_id,
        event_type="test.created.v1",
        aggregate_type="test",
        aggregate_id="aggregate-1",
        producer="test",
        payload={"value": "safe"},
        dedupe_key=dedupe_key,
    )


@pytest.mark.asyncio
async def test_duplicate_enqueue_returns_matching_event_after_atomic_conflict():
    domain_event = event(event_id="event-1")
    existing = OutboxEvent(
        event_id=domain_event.event_id,
        event_type=domain_event.event_type,
        event_version=domain_event.event_version,
        aggregate_type=domain_event.aggregate_type,
        aggregate_id=domain_event.aggregate_id,
        producer=domain_event.producer,
        payload_json=domain_event.model_dump_json_payload(),
        dedupe_key=domain_event.dedupe_key,
    )
    db = MagicMock()
    db.execute = AsyncMock(
        side_effect=[
            SimpleNamespace(scalar_one_or_none=lambda: None),
            SimpleNamespace(scalars=lambda: SimpleNamespace(all=lambda: [existing])),
        ]
    )
    repository = OutboxRepository(db)

    result = await repository.enqueue(domain_event)

    unittest.TestCase().assertIs(result, existing)
    statement = str(db.execute.await_args_list[0].args[0])
    unittest.TestCase().assertIn("ON CONFLICT DO NOTHING", statement)


@pytest.mark.asyncio
async def test_conflicting_dedupe_identity_is_rejected():
    domain_event = event(event_id="event-2")
    existing = OutboxEvent(
        event_id="event-1",
        event_type=domain_event.event_type,
        event_version=domain_event.event_version,
        aggregate_type=domain_event.aggregate_type,
        aggregate_id=domain_event.aggregate_id,
        producer=domain_event.producer,
        payload_json=domain_event.model_dump_json_payload(),
        dedupe_key=domain_event.dedupe_key,
    )
    db = MagicMock()
    db.execute = AsyncMock(
        side_effect=[
            SimpleNamespace(scalar_one_or_none=lambda: None),
            SimpleNamespace(scalars=lambda: SimpleNamespace(all=lambda: [existing])),
        ]
    )
    repository = OutboxRepository(db)

    with pytest.raises(ValueError, match="identity conflicts"):
        await repository.enqueue(domain_event)


@pytest.mark.asyncio
async def test_malformed_outbox_event_does_not_block_valid_batch_event():
    from backend.modules.events.service import OutboxService

    event_row = SimpleNamespace(
        event_id="event-valid",
        event_type="test.created.v1",
        payload_json=event(event_id="event-valid", dedupe_key="valid").model_dump_json_payload(),
    )
    malformed_row = SimpleNamespace(
        event_id="event-malformed",
        event_type="test.created.v1",
        payload_json={"event_type": "missing required fields"},
    )
    failed_row = SimpleNamespace(
        event_id="event-handler-failed",
        event_type="test.created.v1",
        payload_json=event(
            event_id="event-handler-failed", dedupe_key="handler-failed"
        ).model_dump_json_payload(),
    )
    repository = MagicMock()
    repository.claim_batch = AsyncMock(return_value=[malformed_row, failed_row, event_row])
    repository.claim_consumer_receipt = AsyncMock(return_value=True)
    repository.mark_failed = AsyncMock()
    repository.mark_published = AsyncMock()
    db = MagicMock()
    db.begin_nested.return_value.__aenter__ = AsyncMock()
    db.begin_nested.return_value.__aexit__ = AsyncMock(return_value=False)
    db.commit = AsyncMock()
    service = OutboxService(db)
    service.repository = repository
    handled = []

    async def handle(valid_event):
        if valid_event.event_id == "event-handler-failed":
            raise RuntimeError("handler failed")
        handled.append(valid_event.event_id)

    delivered = await service.publish_pending({"test.created.v1": handle})

    unittest.TestCase().assertEqual(delivered, 1)
    unittest.TestCase().assertEqual(handled, ["event-valid"])
    unittest.TestCase().assertEqual(repository.mark_failed.await_count, 2)
    repository.mark_published.assert_awaited_once_with(event_row)
