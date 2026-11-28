"""SQLAlchemy pool / query observability helpers.

Wraps QueuePool ``_do_get`` for accurate checkout wait timing and attaches
engine-level query latency listeners. Observability must never affect I/O
correctness — all metric updates are best-effort.
"""

from __future__ import annotations

import contextlib
from collections.abc import Iterator
from contextlib import contextmanager
from contextvars import ContextVar, Token
from dataclasses import dataclass
from time import monotonic
from typing import Any, Literal

from sqlalchemy import event
from sqlalchemy.engine import Engine

DatabaseRole = Literal["api", "worker"]

_INSTRUMENTED_POOLS: set[int] = set()
_INSTRUMENTED_ENGINES: set[int] = set()


@dataclass(slots=True)
class DatabaseRequestMetrics:
    role: DatabaseRole
    route: str
    query_count: int = 0


_CURRENT_DATABASE_REQUEST: ContextVar[DatabaseRequestMetrics | None] = ContextVar(
    "current_database_request_metrics",
    default=None,
)


@contextmanager
def observe_database_request(*, role: DatabaseRole, route: str) -> Iterator[DatabaseRequestMetrics]:
    """Collect bounded route-level SQL counts for one request scope."""
    request_metrics = DatabaseRequestMetrics(role=role, route=route)
    token: Token[DatabaseRequestMetrics | None] = _CURRENT_DATABASE_REQUEST.set(request_metrics)
    try:
        yield request_metrics
    finally:
        metrics = _safe_metrics()
        if metrics is not None:
            with contextlib.suppress(Exception):
                metrics.database_request_query_count.labels(role=role, route=route).observe(
                    request_metrics.query_count
                )
        _CURRENT_DATABASE_REQUEST.reset(token)


def _record_connection_hold(*, role: DatabaseRole, connection_record: Any) -> None:
    started_at = connection_record.info.pop("db_pool_checkout_started_at", None)
    route = connection_record.info.pop("db_pool_checkout_route", "background")
    if started_at is None:
        return
    metrics = _safe_metrics()
    if metrics is not None:
        with contextlib.suppress(Exception):
            metrics.database_connection_hold_seconds.labels(role=role, route=route).observe(
                monotonic() - started_at
            )


def _safe_metrics():
    try:
        from backend.core.observability import prometheus_metrics as m  # noqa: PLC0415 - lazy metrics import

        return m
    except Exception:
        return None


def update_pool_gauges(*, role: DatabaseRole, pool: Any) -> None:
    """Refresh checked-out / saturation gauges for a pool."""
    metrics = _safe_metrics()
    if metrics is None:
        return
    with contextlib.suppress(Exception):
        checked_out = int(pool.checkedout())
        size = int(getattr(pool, "size", lambda: 0)())
        overflow = int(getattr(pool, "overflow", lambda: 0)())
        # QueuePool.max_overflow is stored as _max_overflow
        max_overflow = int(getattr(pool, "_max_overflow", 0) or 0)
        capacity = max(1, size + max(0, max_overflow))
        metrics.database_pool_checked_out.labels(role=role).set(checked_out)
        metrics.database_pool_saturation.labels(role=role).set(checked_out / capacity)
        metrics.database_pool_size.labels(role=role).set(size)
        metrics.database_pool_overflow.labels(role=role).set(max(0, overflow))


def instrument_pool(*, role: DatabaseRole, pool: Any) -> None:
    """Instrument a sync SQLAlchemy pool for wait / timeout / saturation."""
    pool_id = id(pool)
    if pool_id in _INSTRUMENTED_POOLS:
        return
    _INSTRUMENTED_POOLS.add(pool_id)

    original_do_get = getattr(pool, "_do_get", None)
    if original_do_get is None:
        return

    def _do_get_instrumented() -> Any:
        started = monotonic()
        metrics = _safe_metrics()
        try:
            connection = original_do_get()
            if metrics is not None:
                with contextlib.suppress(Exception):
                    metrics.database_pool_wait_seconds.labels(role=role).observe(
                        monotonic() - started
                    )
            update_pool_gauges(role=role, pool=pool)
            return connection
        except Exception as exc:
            if metrics is not None:
                with contextlib.suppress(Exception):
                    name = type(exc).__name__.lower()
                    message = str(exc).lower()
                    is_timeout = "timeout" in name or "timeout" in message
                    if is_timeout:
                        metrics.database_pool_timeouts_total.labels(role=role).inc()
                    metrics.database_pool_connection_failures_total.labels(
                        role=role,
                        reason="timeout" if is_timeout else type(exc).__name__,
                    ).inc()
            update_pool_gauges(role=role, pool=pool)
            raise

    pool._do_get = _do_get_instrumented  # type: ignore[method-assign]

    @event.listens_for(pool, "checkout")
    def _on_checkout(_dbapi_connection: Any, connection_record: Any, *_args: Any) -> None:
        request_metrics = _CURRENT_DATABASE_REQUEST.get()
        connection_record.info["db_pool_checkout_started_at"] = monotonic()
        connection_record.info["db_pool_checkout_route"] = (
            request_metrics.route if request_metrics is not None else "background"
        )
        update_pool_gauges(role=role, pool=pool)

    @event.listens_for(pool, "checkin")
    def _on_checkin(_dbapi_connection: Any, connection_record: Any) -> None:
        _record_connection_hold(role=role, connection_record=connection_record)
        update_pool_gauges(role=role, pool=pool)

    @event.listens_for(pool, "invalidate")
    def _on_invalidate(_dbapi_connection: Any, connection_record: Any, _exception: Any) -> None:
        _record_connection_hold(role=role, connection_record=connection_record)
        metrics = _safe_metrics()
        if metrics is not None:
            with contextlib.suppress(Exception):
                metrics.database_pool_connection_failures_total.labels(
                    role=role,
                    reason="invalidate",
                ).inc()
        update_pool_gauges(role=role, pool=pool)


def instrument_engine(*, role: DatabaseRole, sync_engine: Engine) -> None:
    """Attach pool + query-latency instrumentation to a sync Engine."""
    engine_id = id(sync_engine)
    if engine_id in _INSTRUMENTED_ENGINES:
        return
    _INSTRUMENTED_ENGINES.add(engine_id)

    instrument_pool(role=role, pool=sync_engine.pool)

    @event.listens_for(sync_engine, "before_cursor_execute")
    def _before_cursor_execute(
        conn: Any,
        _cursor: Any,
        _statement: Any,
        _parameters: Any,
        _context: Any,
        _executemany: Any,
    ) -> None:
        conn.info["db_query_started_at"] = monotonic()
        request_metrics = _CURRENT_DATABASE_REQUEST.get()
        if request_metrics is not None:
            request_metrics.query_count += 1

    @event.listens_for(sync_engine, "after_cursor_execute")
    def _after_cursor_execute(
        conn: Any,
        _cursor: Any,
        _statement: Any,
        _parameters: Any,
        _context: Any,
        _executemany: Any,
    ) -> None:
        started = conn.info.pop("db_query_started_at", None)
        if started is None:
            return
        metrics = _safe_metrics()
        if metrics is None:
            return
        with contextlib.suppress(Exception):
            metrics.database_query_duration_seconds.labels(role=role).observe(monotonic() - started)
