"""Celery entrypoint for outbox delivery."""

from __future__ import annotations

from backend.workers.async_dispatch import run_async_in_sync_context


def publish_outbox_events_sync(*, limit: int = 100) -> int:
    from backend.core.db.session import SessionLocal
    from backend.modules.events.handlers import build_event_handlers
    from backend.modules.events.service import OutboxService

    async def _run() -> int:
        async with SessionLocal() as db:
            return await OutboxService(db).publish_pending(build_event_handlers(), limit=limit)

    return run_async_in_sync_context(_run())
