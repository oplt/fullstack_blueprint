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
            try:
                handler = handlers.get(row.event_type)
                event = DomainEvent.model_validate(row.payload_json)
                if handler is None:
                    raise LookupError(f"No handler registered for {row.event_type}")
                await self.consume_once(
                    event,
                    consumer_name=f"event:{row.event_type}",
                    handler=handler,
                )
            except Exception as exc:
                await self.repository.mark_failed(row, error=type(exc).__name__)
                logger.warning(
                    "Outbox delivery failed event=%s error=%s",
                    row.event_id,
                    type(exc).__name__,
                )
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

        async with self.db.begin_nested():
            claimed = await self.repository.claim_consumer_receipt(
                event_id=event.event_id,
                consumer_name=consumer_name,
            )
            if not claimed:
                return False
            await handler(event)
        return True
