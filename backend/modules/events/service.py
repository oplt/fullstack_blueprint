"""Application service for transactional event persistence."""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable

from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.events.domain import DomainEvent
from backend.modules.events.repository import OutboxRepository

logger = logging.getLogger(__name__)

EventHandler = Callable[[DomainEvent], Awaitable[None]]


class OutboxService:
    """Persist events in the caller's transaction; never publish inline."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repository = OutboxRepository(db)

    async def enqueue(self, event: DomainEvent):
        return await self.repository.enqueue(event)

    async def publish_pending(
        self,
        handlers: dict[str, EventHandler],
        *,
        limit: int = 100,
    ) -> int:
        """Deliver a claimed batch with idempotent status transitions."""

        delivered = 0
        rows = await self.repository.claim_batch(limit=limit)
        for row in rows:
            handler = handlers.get(row.event_type)
            event = DomainEvent.model_validate(row.payload_json)
            try:
                if handler is None:
                    raise LookupError(f"No handler registered for {row.event_type}")
                await self.consume_once(
                    event,
                    consumer_name=f"event:{row.event_type}",
                    handler=handler,
                )
            except Exception as exc:
                await self.repository.mark_failed(row, error=f"{type(exc).__name__}: {exc}")
                logger.warning("Outbox delivery failed event=%s", row.event_id, exc_info=True)
            else:
                await self.repository.mark_published(row)
                delivered += 1
        await self.db.commit()
        return delivered

    async def consume_once(
        self,
        event: DomainEvent,
        *,
        consumer_name: str,
        handler: EventHandler,
    ) -> bool:
        """Run a consumer once per event identity in this DB transaction.

        A consumer that changes application data should use the same session
        and transaction owner before this receipt is committed. External side
        effects must additionally use the event ID as their provider idempotency
        key.
        """

        if await self.repository.has_consumer_processed(
            event_id=event.event_id,
            consumer_name=consumer_name,
        ):
            return False
        await handler(event)
        await self.repository.record_consumer_processed(
            event_id=event.event_id,
            consumer_name=consumer_name,
        )
        return True
