"""Outbox persistence contract and SQLAlchemy adapter."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Protocol

from sqlalchemy import or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.events.domain import DomainEvent
from backend.modules.events.models import OutboxConsumerReceipt, OutboxEvent


class OutboxRepositoryProtocol(Protocol):
    async def enqueue(self, event: DomainEvent) -> OutboxEvent: ...


class OutboxRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def enqueue(self, event: DomainEvent) -> OutboxEvent:
        values = dict(
            event_id=event.event_id,
            event_type=event.event_type,
            event_version=event.event_version,
            aggregate_type=event.aggregate_type,
            aggregate_id=event.aggregate_id,
            producer=event.producer,
            payload_json=event.model_dump_json_payload(),
            dedupe_key=event.dedupe_key,
        )
        statement = (
            insert(OutboxEvent).values(**values).on_conflict_do_nothing().returning(OutboxEvent.id)
        )
        inserted_id = (await self.db.execute(statement)).scalar_one_or_none()
        if inserted_id is not None:
            inserted_event = await self.db.get(OutboxEvent, inserted_id)
            if inserted_event is None:
                raise RuntimeError("Inserted outbox event could not be loaded")
            return inserted_event

        conditions = [OutboxEvent.event_id == event.event_id]
        if event.dedupe_key:
            conditions.append(OutboxEvent.dedupe_key == event.dedupe_key)
        matches = list(
            (await self.db.execute(select(OutboxEvent).where(or_(*conditions)))).scalars().all()
        )
        if len(matches) != 1 or not self._same_event(matches[0], values):
            raise ValueError("Outbox event identity conflicts with an existing event")
        return matches[0]

    @staticmethod
    def _same_event(existing: OutboxEvent, values: dict) -> bool:
        return all(
            getattr(existing, key) == values[key]
            for key in (
                "event_id",
                "event_type",
                "event_version",
                "aggregate_type",
                "aggregate_id",
                "producer",
                "payload_json",
                "dedupe_key",
            )
        )

    async def claim_batch(
        self, *, limit: int = 100, lock_timeout_seconds: int = 300
    ) -> list[OutboxEvent]:
        now = datetime.now(UTC)
        stale_before = now - timedelta(seconds=lock_timeout_seconds)
        stmt = (
            select(OutboxEvent)
            .where(
                OutboxEvent.available_at <= now,
                or_(
                    OutboxEvent.status == "pending",
                    (OutboxEvent.status == "processing") & (OutboxEvent.locked_at < stale_before),
                ),
            )
            .order_by(OutboxEvent.created_at.asc())
            .limit(limit)
            .with_for_update(skip_locked=True)
        )
        rows = list((await self.db.execute(stmt)).scalars().all())
        for row in rows:
            row.status = "processing"
            row.locked_at = now
            row.attempts += 1
        await self.db.flush()
        return rows

    async def mark_published(self, row: OutboxEvent) -> None:
        row.status = "published"
        row.published_at = datetime.now(UTC)
        row.locked_at = None
        row.last_error = None
        await self.db.flush()

    async def mark_failed(
        self,
        row: OutboxEvent,
        *,
        error: str,
        max_attempts: int = 10,
        base_delay_seconds: int = 5,
    ) -> None:
        row.status = "dead_letter" if row.attempts >= max_attempts else "pending"
        row.locked_at = None
        row.last_error = error[:2000]
        if row.status == "pending":
            row.available_at = datetime.now(UTC) + timedelta(
                seconds=min(base_delay_seconds * (2 ** max(0, row.attempts - 1)), 3600)
            )
        await self.db.flush()

    async def has_consumer_processed(self, *, event_id: str, consumer_name: str) -> bool:
        receipt = await self.db.scalar(
            select(OutboxConsumerReceipt).where(
                OutboxConsumerReceipt.event_id == event_id,
                OutboxConsumerReceipt.consumer_name == consumer_name,
            )
        )
        return receipt is not None

    async def record_consumer_processed(self, *, event_id: str, consumer_name: str) -> None:
        await self.db.execute(
            insert(OutboxConsumerReceipt)
            .values(event_id=event_id, consumer_name=consumer_name)
            .on_conflict_do_nothing(index_elements=["event_id", "consumer_name"])
        )

    async def claim_consumer_receipt(self, *, event_id: str, consumer_name: str) -> bool:
        result = await self.db.execute(
            insert(OutboxConsumerReceipt)
            .values(event_id=event_id, consumer_name=consumer_name)
            .on_conflict_do_nothing(index_elements=["event_id", "consumer_name"])
            .returning(OutboxConsumerReceipt.id)
        )
        return result.scalar_one_or_none() is not None
