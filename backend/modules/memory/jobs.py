from __future__ import annotations

import logging

from backend.core.cache import get_redis_client
from backend.core.config import settings
from backend.workers.async_dispatch import (
    dispatch_background_sync_job,
    resolve_celery_task,
    run_async_in_sync_context,
)

logger = logging.getLogger(__name__)
_TURN_EXTRACTION_LEASE_SECONDS = 15 * 60


async def _claim_turn_extraction(redis_client, completion_key: str) -> tuple[bool, str | None]:
    """Claim one extraction while allowing crashed workers to recover by expiry."""
    try:
        if await redis_client.get(completion_key):
            return False, None
        lock_key = f"{completion_key}:lease"
        claimed = await redis_client.set(
            lock_key,
            "1",
            ex=_TURN_EXTRACTION_LEASE_SECONDS,
            nx=True,
        )
        return bool(claimed), lock_key if claimed else None
    except Exception:
        logger.warning("Memory extraction idempotency cache unavailable", exc_info=True)
        return True, None


def extract_turn_memories_sync(  # noqa: PLR0913 - mirrors the stable Celery payload
    *,
    user_id: str,
    agent_id: str,
    run_id: str,
    project_id: str | None,
    user_message: str,
    assistant_message: str,
    source_message_id: str,
) -> None:
    from backend.core.db.session import SessionLocal  # noqa: PLC0415 - worker-only import
    from backend.modules.memory.service import MemoryService  # noqa: PLC0415 - worker-only import

    async def _run() -> None:
        completion_key = f"memory:turn-extraction:complete:{source_message_id}"
        redis_client = get_redis_client()
        claimed, lease_key = await _claim_turn_extraction(redis_client, completion_key)
        if not claimed:
            logger.info("Memory extraction already claimed source_message=%s", source_message_id)
            return
        try:
            async with SessionLocal() as db:
                service = MemoryService(db)
                await service.process_turn_memories(
                    user_id=user_id,
                    agent_id=agent_id,
                    run_id=run_id,
                    project_id=project_id,
                    user_message=user_message,
                    assistant_message=assistant_message,
                    source_message_id=source_message_id,
                )
            try:
                await redis_client.set(completion_key, "1", ex=30 * 24 * 60 * 60)
            except Exception:
                logger.warning("Memory extraction completion cache unavailable", exc_info=True)
        finally:
            if lease_key is not None:
                try:
                    await redis_client.delete(lease_key)
                except Exception:
                    logger.warning("Memory extraction lease cleanup failed", exc_info=True)

    run_async_in_sync_context(_run())


def queue_turn_memory_extraction(**payload: str | None) -> None:
    celery_task = resolve_celery_task("extract_turn_memories_task")

    kwargs = {
        "user_id": str(payload["user_id"]),
        "agent_id": str(payload["agent_id"]),
        "run_id": str(payload["run_id"]),
        "project_id": payload.get("project_id"),
        "user_message": str(payload["user_message"]),
        "assistant_message": str(payload["assistant_message"]),
        "source_message_id": str(payload["source_message_id"]),
    }
    dispatch_background_sync_job(
        target=extract_turn_memories_sync,
        kwargs=kwargs,
        celery_task=celery_task,
        celery_kwargs=kwargs,
        queue=settings.CELERY_TASK_DEFAULT_QUEUE,
        job_name="memory-extraction",
    )
    logger.info("Queued memory extraction source_message=%s", kwargs["source_message_id"])
