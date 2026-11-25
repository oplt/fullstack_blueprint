"""Low-cardinality worker liveness markers backed by Redis TTLs."""

from __future__ import annotations

import socket
from datetime import UTC, datetime

import redis

from backend.core.cache import get_redis_client
from backend.core.config import settings

WORKER_HEALTH_PREFIX = "ga:worker:health:"
WORKER_HEALTH_TTL_SECONDS = 60


def worker_health_key(hostname: str | None = None) -> str:
    return f"{WORKER_HEALTH_PREFIX}{hostname or socket.gethostname()}"


def mark_worker_ready() -> None:
    client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        client.set(
            worker_health_key(),
            datetime.now(UTC).isoformat(),
            ex=WORKER_HEALTH_TTL_SECONDS,
        )
    finally:
        client.close()


def mark_worker_stopped() -> None:
    client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        client.delete(worker_health_key())
    finally:
        client.close()


async def healthy_worker_count() -> int:
    count = 0
    async for _ in get_redis_client().scan_iter(match=f"{WORKER_HEALTH_PREFIX}*"):
        count += 1
    return count


async def queue_depths() -> dict[str, int]:
    queues = (settings.CELERY_TASK_DEFAULT_QUEUE, settings.CELERY_EMAIL_QUEUE)
    client = get_redis_client()
    return {queue: int(await client.llen(queue)) for queue in dict.fromkeys(queues)}
