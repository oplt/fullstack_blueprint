"""Shared helpers for running async jobs from sync Celery tasks or dev eager mode."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Callable, Coroutine
from concurrent.futures import Future, ThreadPoolExecutor
from importlib import import_module
from queue import Queue
from threading import BoundedSemaphore, Event, Lock, Thread
from time import time
from typing import Any, TypeVar
from uuid import uuid4

from backend.core.cache import create_redis_client, redis_client_override
from backend.core.config import settings
from backend.core.observability.logging import get_correlation_id

logger = logging.getLogger(__name__)

_eager_warning_logged = False
_eager_executor: ThreadPoolExecutor | None = None
_eager_slots: BoundedSemaphore | None = None
_eager_lock = Lock()
_worker_runtime: _WorkerAsyncRuntime | None = None
_worker_runtime_lock = Lock()

T = TypeVar("T")


def resolve_celery_task(name: str) -> Any | None:
    if settings.CELERY_TASK_ALWAYS_EAGER:
        return None
    return getattr(import_module("backend.workers.tasks"), name)


class _WorkerAsyncRuntime:
    """One worker-process loop and pooled engine, isolated from FastAPI's loop."""

    def __init__(self) -> None:
        self._ready = Event()
        self._loop: asyncio.AbstractEventLoop | None = None
        self._sessionmaker: Any = None
        self._redis = create_redis_client()
        self._startup_error: BaseException | None = None
        self._jobs: Queue[tuple[Coroutine[Any, Any, Any], Future[Any]] | None] = Queue()
        self._thread = Thread(target=self._run, name="blueprint-worker-async", daemon=True)
        self._thread.start()
        self._ready.wait()
        if self._startup_error is not None:
            raise RuntimeError("Unable to initialize worker async runtime") from self._startup_error
        if self._loop is None:
            raise RuntimeError("Worker runtime initialized without an event loop")

    def _run(self) -> None:
        loop = asyncio.new_event_loop()
        engine = None
        asyncio.set_event_loop(loop)
        try:
            from backend.core.db.session import create_worker_sessionmaker  # noqa: PLC0415 - worker fork init

            engine, self._sessionmaker = create_worker_sessionmaker()
            self._loop = loop
        except BaseException as exc:
            self._startup_error = exc
        finally:
            self._ready.set()
        if self._startup_error is not None:
            loop.run_until_complete(self._redis.aclose())
            loop.close()
            return
        try:
            while (job := self._jobs.get()) is not None:
                coro, future = job
                if future.set_running_or_notify_cancel():
                    try:
                        future.set_result(loop.run_until_complete(self._execute(coro)))
                    except BaseException as exc:
                        future.set_exception(exc)
        finally:

            async def close_resources() -> None:
                try:
                    if settings.AI_ENABLED or settings.RAG_ENABLED:
                        from backend.modules.ai.providers import close_ai_provider_http_clients  # noqa: PLC0415 - worker fork init

                        await close_ai_provider_http_clients()
                finally:
                    try:
                        await self._redis.aclose()
                    finally:
                        if engine is not None:
                            await engine.dispose()

            try:
                loop.run_until_complete(close_resources())
            finally:
                loop.close()

    def close(self) -> None:
        self._jobs.put(None)
        self._thread.join()

    async def _execute(self, coro: Coroutine[Any, Any, T]) -> T:
        from backend.core.db.session import _sessionmaker_override  # noqa: PLC0415 - worker fork init

        token = _sessionmaker_override.set(self._sessionmaker)
        redis_token = redis_client_override.set(self._redis)
        try:
            return await coro
        finally:
            redis_client_override.reset(redis_token)
            _sessionmaker_override.reset(token)

    def run(self, coro: Coroutine[Any, Any, T]) -> T:
        future: Future[T] = Future()
        self._jobs.put((coro, future))
        return future.result()


def _get_worker_runtime() -> _WorkerAsyncRuntime:
    global _worker_runtime  # noqa: PLW0603 - process-lifetime worker runtime
    with _worker_runtime_lock:
        if _worker_runtime is None:
            _worker_runtime = _WorkerAsyncRuntime()
        return _worker_runtime


def run_async_in_sync_context[T](coro: Coroutine[Any, Any, T]) -> T:
    """Run a coroutine on the worker-process event loop and pooled engine.

    The runtime is deliberately separate from FastAPI's event loop. It is
    initialized lazily inside the Celery/eager worker process and reused by
    subsequent jobs, so connection pools are not recreated per execution.
    """
    return _get_worker_runtime().run(coro)


def shutdown_background_runtime() -> None:
    global _eager_executor, _eager_slots, _worker_runtime  # noqa: PLW0603 - process-lifetime runtime
    with _eager_lock:
        executor, _eager_executor = _eager_executor, None
        _eager_slots = None
    if executor is not None:
        executor.shutdown(wait=True)
    with _worker_runtime_lock:
        runtime, _worker_runtime = _worker_runtime, None
    if runtime is not None:
        runtime.close()


def _eager_executor_for_settings() -> tuple[ThreadPoolExecutor, BoundedSemaphore]:
    """Lazily construct a process-local bounded executor for eager development."""
    global _eager_executor, _eager_slots  # noqa: PLW0603 - process-lifetime executor
    with _eager_lock:
        if _eager_executor is None:
            workers = max(1, settings.EAGER_BACKGROUND_MAX_WORKERS)
            pending = max(workers, settings.EAGER_BACKGROUND_MAX_PENDING)
            _eager_executor = ThreadPoolExecutor(
                max_workers=workers,
                thread_name_prefix="blueprint-eager",
            )
            _eager_slots = BoundedSemaphore(pending)
        if _eager_slots is None:
            raise RuntimeError("Eager worker slots were not initialized")
        return _eager_executor, _eager_slots


def _release_eager_slot(_: Future[Any], slots: BoundedSemaphore) -> None:
    slots.release()


def dispatch_background_sync_job(
    *,
    target: Callable[..., None],
    kwargs: dict[str, Any],
    celery_task: Any | None,
    celery_kwargs: dict[str, Any],
    queue: str,
    job_name: str,
    task_id: str | None = None,
) -> str | None:
    """Queue work on Celery, or a bounded local executor in eager mode."""
    global _eager_warning_logged  # noqa: PLW0603 - process-lifetime log guard

    if settings.CELERY_TASK_ALWAYS_EAGER:
        if not _eager_warning_logged:
            logger.warning(
                "CELERY_TASK_ALWAYS_EAGER=true: %s jobs run in background threads inside "
                "the API process. Set CELERY_TASK_ALWAYS_EAGER=false and run Celery workers "
                "in production.",
                job_name,
            )
            _eager_warning_logged = True
        executor, slots = _eager_executor_for_settings()
        if not slots.acquire(blocking=False):
            raise RuntimeError(
                "Eager background capacity is exhausted; run Celery workers or retry shortly."
            )
        future = executor.submit(target, **kwargs)
        future.add_done_callback(lambda completed: _release_eager_slot(completed, slots))
        return task_id

    if celery_task is None:
        raise RuntimeError(
            "Celery worker extra is required unless eager background mode is enabled"
        )
    apply_kwargs: dict[str, Any] = {
        "kwargs": celery_kwargs,
        "queue": queue,
        "headers": _celery_observability_headers(),
    }
    if task_id:
        apply_kwargs["task_id"] = task_id
    try:
        result = celery_task.apply_async(**apply_kwargs)
    except Exception as exc:
        # Celery raises on duplicate task_id when the prior task still exists —
        # treat as successful idempotent republish of the same identity.
        if task_id and "Duplicate" in type(exc).__name__:
            logger.info("idempotent celery republish task_id=%s job=%s", task_id, job_name)
            return task_id
        raise
    return str(result.id)


def _celery_observability_headers() -> dict[str, Any]:
    """Correlation id + enqueue wall-clock for worker queue-delay metrics."""
    return {
        "correlation_id": get_correlation_id() or str(uuid4()),
        "enqueued_at": time(),
    }


def log_eager_mode_startup_warning() -> None:
    """Emit a single startup warning when eager Celery mode is enabled."""
    if not settings.CELERY_TASK_ALWAYS_EAGER:
        return
    if settings.APP_ENV == "production":
        logger.warning(
            "CELERY_TASK_ALWAYS_EAGER is enabled in production. Background jobs execute "
            "inside the API process instead of dedicated Celery workers."
        )
        return
    logger.info(
        "CELERY_TASK_ALWAYS_EAGER=true for local development. Indexing and email jobs "
        "will not use a separate Celery worker process."
    )
