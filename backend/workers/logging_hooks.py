"""Celery worker logging and observability hooks."""

from __future__ import annotations

import contextlib
import logging
from time import perf_counter, time
from typing import Any
from uuid import uuid4

from celery.signals import (
    before_task_publish,
    heartbeat_sent,
    task_failure,
    task_postrun,
    task_prerun,
    task_retry,
    worker_process_shutdown,
    worker_ready,
    worker_shutdown,
)

from backend.core.config import settings
from backend.core.log_context import reset_correlation_id, set_correlation_id
from backend.core.logging import setup_logging

logger = logging.getLogger("backend.worker")

_task_started_at: dict[str, float] = {}
_task_correlation_tokens: dict[str, Any] = {}

CORRELATION_HEADER = "correlation_id"
ENQUEUED_AT_HEADER = "enqueued_at"


def _task_label(task: Any) -> str:
    name = getattr(task, "name", None) or "unknown"
    return str(name)[-80:]


def _safe_worker_metrics():
    try:
        from backend.observability import prometheus_metrics as m

        return m
    except Exception:
        return None


@worker_process_shutdown.connect
@worker_shutdown.connect
def close_worker_runtime(**_kwargs) -> None:
    from backend.workers.async_dispatch import shutdown_background_runtime

    shutdown_background_runtime()
    with contextlib.suppress(Exception):
        from backend.workers.health import mark_worker_stopped

        mark_worker_stopped()


@worker_ready.connect
def configure_worker_logging(**_kwargs) -> None:
    setup_logging()
    with contextlib.suppress(Exception):
        from backend.workers.health import mark_worker_ready

        mark_worker_ready()
    logger.info("Celery worker ready")


@heartbeat_sent.connect
def refresh_worker_health(**_kwargs) -> None:
    with contextlib.suppress(Exception):
        from backend.workers.health import mark_worker_ready

        mark_worker_ready()


@before_task_publish.connect
def attach_correlation_and_enqueue_time(
    sender: Any = None,
    headers: dict[str, Any] | None = None,
    **_kwargs: Any,
) -> None:
    """Stamp correlation id + enqueue wall time onto Celery message headers."""
    if headers is None:
        return
    with contextlib.suppress(Exception):
        from backend.core.log_context import get_correlation_id

        correlation_id = get_correlation_id() or str(uuid4())
        headers.setdefault(CORRELATION_HEADER, correlation_id)
        headers.setdefault(ENQUEUED_AT_HEADER, time())


@task_prerun.connect
def log_task_start(task_id=None, task=None, **kwargs) -> None:
    if task_id is None:
        return
    _task_started_at[task_id] = perf_counter()
    headers = getattr(getattr(task, "request", None), "headers", None) or {}
    if not isinstance(headers, dict):
        headers = {}
    # Celery may also expose custom headers on the request directly.
    request = getattr(task, "request", None)
    correlation_id = (
        headers.get(CORRELATION_HEADER)
        or getattr(request, CORRELATION_HEADER, None)
        or str(uuid4())
    )
    with contextlib.suppress(Exception):
        _task_correlation_tokens[task_id] = set_correlation_id(str(correlation_id))

    enqueued_at = headers.get(ENQUEUED_AT_HEADER) or getattr(request, ENQUEUED_AT_HEADER, None)
    metrics = _safe_worker_metrics()
    if metrics is not None and enqueued_at is not None:
        with contextlib.suppress(Exception):
            delay = max(0.0, time() - float(enqueued_at))
            metrics.worker_task_queue_delay_seconds.labels(task=_task_label(task)).observe(delay)

    logger.info(
        "job_start task=%s id=%s correlation_id=%s",
        getattr(task, "name", "unknown"),
        task_id,
        correlation_id,
    )


@task_postrun.connect
def log_task_complete(task_id=None, task=None, state=None, **_kwargs) -> None:
    if task_id is None:
        return
    started = _task_started_at.pop(task_id, None)
    duration_s = (perf_counter() - started) if started is not None else -1.0
    duration_ms = duration_s * 1000 if duration_s >= 0 else -1.0
    task_name = getattr(task, "name", "unknown")
    label = _task_label(task)
    state_label = str(state or "UNKNOWN")

    metrics = _safe_worker_metrics()
    if metrics is not None and duration_s >= 0:
        with contextlib.suppress(Exception):
            metrics.worker_task_duration_seconds.labels(task=label, state=state_label).observe(
                duration_s
            )
            metrics.worker_tasks_total.labels(task=label, state=state_label).inc()

    token = _task_correlation_tokens.pop(task_id, None)
    if token is not None:
        with contextlib.suppress(Exception):
            reset_correlation_id(token)

    if state == "SUCCESS":
        if duration_ms >= settings.SLOW_JOB_MS:
            logger.warning(
                "slow_job task=%s id=%s duration_ms=%.2f state=%s",
                task_name,
                task_id,
                duration_ms,
                state,
            )
        else:
            logger.info(
                "job_complete task=%s id=%s duration_ms=%.2f state=%s",
                task_name,
                task_id,
                duration_ms,
                state,
            )
    else:
        logger.warning(
            "job_finished task=%s id=%s duration_ms=%.2f state=%s",
            task_name,
            task_id,
            duration_ms,
            state,
        )


@task_failure.connect
def log_task_failure(task_id=None, task=None, exception=None, **_kwargs) -> None:
    logger.error(
        "job_failed task=%s id=%s error_type=%s error_message=%s",
        getattr(task, "name", "unknown"),
        task_id,
        type(exception).__name__ if exception else "Exception",
        str(exception)[:300] if exception else "",
        exc_info=True,
    )


@task_retry.connect
def log_task_retry(request=None, **_kwargs) -> None:
    metrics = _safe_worker_metrics()
    if metrics is not None:
        with contextlib.suppress(Exception):
            metrics.worker_task_retries_total.labels(
                task=str(getattr(request, "task", "unknown"))[-80:]
            ).inc()
