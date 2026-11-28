from __future__ import annotations

import logging
import time
from collections.abc import Iterator
from contextlib import contextmanager
from functools import lru_cache
from typing import Any

from fastapi import Request, Response

from backend.core.observability.setup import load_config

logger = logging.getLogger(__name__)


def _safe_attrs(attrs: dict[str, Any] | None = None) -> dict[str, str | int | float | bool]:
    safe: dict[str, str | int | float | bool] = {}
    for key, value in (attrs or {}).items():
        if value is None:
            continue
        if isinstance(value, str | int | float | bool):
            safe[key] = value
        else:
            safe[key] = str(value)
    return safe


@lru_cache(maxsize=1)
def _meter():
    from opentelemetry import metrics  # noqa: PLC0415 - optional telemetry

    return metrics.get_meter("generic_app.telemetry")


@lru_cache(maxsize=1)
def _instruments() -> dict[str, Any]:
    meter = _meter()
    return {
        "api_request_failures": meter.create_counter("generic_app.api.request_failures"),
        "background_jobs_total": meter.create_counter("generic_app.background_jobs_total"),
        "background_job_duration_ms": meter.create_histogram(
            "generic_app.background_job_duration_ms",
            unit="ms",
        ),
    }


def add(name: str, value: int | float = 1, attrs: dict[str, Any] | None = None) -> None:
    try:
        _instruments()[name].add(value, _safe_attrs(attrs))
    except Exception:
        return


def record(name: str, value: int | float, attrs: dict[str, Any] | None = None) -> None:
    try:
        _instruments()[name].record(value, _safe_attrs(attrs))
    except Exception:
        return


def setup_metrics(app: Any) -> None:
    """Expose Prometheus metrics without making app startup depend on Prometheus."""

    config = load_config()
    if not config.prometheus_metrics_enabled:
        logger.info("Prometheus metrics disabled by PROMETHEUS_METRICS_ENABLED")
        return
    if getattr(app.state, "prometheus_metrics_instrumented", False):
        return
    try:
        from prometheus_client import CONTENT_TYPE_LATEST, generate_latest  # noqa: PLC0415 - optional metrics

        from backend.core.observability import prometheus_metrics  # noqa: PLC0415 - optional metrics
    except ImportError:
        logger.warning("prometheus-client not installed - Prometheus metrics disabled")
        return

    @app.middleware("http")
    async def prometheus_metrics_middleware(request: Request, call_next: Any) -> Response:
        if request.url.path == config.prometheus_metrics_path:
            return await call_next(request)

        started_at = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception as exc:
            elapsed = time.perf_counter() - started_at
            route = _route_path(request)
            prometheus_metrics.http_request_duration_seconds.labels(
                request.method,
                route,
            ).observe(elapsed)
            prometheus_metrics.http_requests_total.labels(
                request.method,
                route,
                "500",
            ).inc()
            prometheus_metrics.http_exceptions_total.labels(
                request.method,
                route,
                type(exc).__name__,
            ).inc()
            raise

        elapsed = time.perf_counter() - started_at
        route = _route_path(request)
        prometheus_metrics.http_request_duration_seconds.labels(
            request.method,
            route,
        ).observe(elapsed)
        prometheus_metrics.http_requests_total.labels(
            request.method,
            route,
            str(response.status_code),
        ).inc()
        return response

    def metrics_endpoint() -> Response:
        return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)

    app.add_api_route(
        config.prometheus_metrics_path,
        metrics_endpoint,
        methods=["GET"],
        include_in_schema=False,
    )
    app.state.prometheus_metrics_instrumented = True


def _route_path(request: Request) -> str:
    route = request.scope.get("route")
    path = getattr(route, "path", None)
    if isinstance(path, str) and path:
        return path
    return "unmatched"


def _attrs(kwargs: dict[str, Any]) -> dict[str, Any]:
    attrs: dict[str, Any] = {}
    for key, value in kwargs.items():
        if value is None:
            continue
        attr = key.replace("_", ".")
        if isinstance(value, str | bool | int | float):
            attrs[attr] = value
        else:
            attrs[attr] = str(value)
    return attrs


@contextmanager
def observed_span(name: str, **attributes: Any) -> Iterator[Any]:
    """Create a span, attach safe attrs, record failures, then re-raise."""

    try:
        from opentelemetry import trace  # noqa: PLC0415 - optional telemetry
        from opentelemetry.trace import Status, StatusCode  # noqa: PLC0415 - optional telemetry
    except Exception:
        yield None
        return

    tracer = trace.get_tracer("generic_app.observability")
    with tracer.start_as_current_span(name, attributes=_attrs(attributes)) as span:
        started = time.monotonic()
        try:
            yield span
        except Exception as exc:
            span.record_exception(exc)
            span.set_status(Status(StatusCode.ERROR, type(exc).__name__))
            raise
        finally:
            span.set_attribute("latency_ms", (time.monotonic() - started) * 1000.0)


def structured_error(
    logger: logging.Logger,
    message: str,
    exc: BaseException,
    **fields: Any,
) -> None:
    extra = {
        key: value
        for key, value in fields.items()
        if value is not None and isinstance(value, str | bool | int | float)
    }
    extra["error_type"] = type(exc).__name__
    extra["error_message"] = str(exc)[:500]
    logger.error(message, extra=extra, exc_info=True)
