"""Observability runtime configuration.

OTLP endpoint resolution:
- Prefer ``OTEL_EXPORTER_OTLP_ENDPOINT`` (OpenTelemetry standard).
- Fall back to legacy ``OTLP_ENDPOINT`` when the OTEL variable is unset.
- ``OTEL_EXPORTER_OTLP_PROTOCOL`` defaults to ``http/protobuf``; legacy-only
  ``OTLP_ENDPOINT`` without OTEL endpoint implies gRPC for backward compatibility.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any

from backend.core.config import settings
from backend.core.observability.sentry import setup_sentry


def env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None or not value.strip():
        return default
    return value.strip().lower() not in {"0", "false", "no", "off"}


def env_str(name: str, default: str) -> str:
    value = os.getenv(name)
    return value.strip() if value and value.strip() else default


@dataclass(frozen=True)
class ObservabilityConfig:
    enabled: bool = True
    service_name: str = "fullstack-blueprint"
    environment: str = "local"
    otlp_endpoint: str = "http://localhost:4318"
    otlp_protocol: str = "http/protobuf"
    otlp_insecure: bool = True
    traces_exporter: str = "otlp"
    metrics_exporter: str = "none"
    prometheus_metrics_enabled: bool = True
    prometheus_metrics_path: str = "/metrics"


def load_config() -> ObservabilityConfig:
    legacy_endpoint = settings.OTLP_ENDPOINT.strip()
    configured_endpoint = settings.OTEL_EXPORTER_OTLP_ENDPOINT.strip() or legacy_endpoint
    configured_protocol = (
        "grpc"
        if legacy_endpoint and not settings.OTEL_EXPORTER_OTLP_ENDPOINT
        else settings.OTEL_EXPORTER_OTLP_PROTOCOL
    )

    return ObservabilityConfig(
        enabled=settings.OBSERVABILITY_ENABLED,
        service_name=env_str("OTEL_SERVICE_NAME", settings.OTEL_SERVICE_NAME or settings.APP_NAME),
        environment=settings.APP_ENV or env_str("APP_ENV", "local"),
        otlp_endpoint=env_str(
            "OTEL_EXPORTER_OTLP_ENDPOINT", configured_endpoint or "http://localhost:4318"
        ).rstrip("/"),
        otlp_protocol=env_str("OTEL_EXPORTER_OTLP_PROTOCOL", configured_protocol).lower(),
        otlp_insecure=env_bool("OTLP_INSECURE", settings.OTLP_INSECURE),
        traces_exporter=env_str("OTEL_TRACES_EXPORTER", settings.OTEL_TRACES_EXPORTER).lower(),
        metrics_exporter=settings.OTEL_METRICS_EXPORTER.lower(),
        prometheus_metrics_enabled=settings.PROMETHEUS_METRICS_ENABLED,
        prometheus_metrics_path=settings.PROMETHEUS_METRICS_PATH,
    )


def setup_observability(app: Any | None = None) -> None:
    from backend.core.observability.metrics import setup_metrics  # noqa: PLC0415 - runtime setup
    from backend.core.observability.tracing import setup_traces  # noqa: PLC0415 - runtime setup

    setup_sentry(
        settings.SENTRY_DSN,
        settings.APP_ENV,
        settings.SENTRY_TRACES_SAMPLE_RATE,
    )
    if app is not None:
        setup_metrics(app)
    setup_traces(app=app, service_name=settings.OTEL_SERVICE_NAME)
