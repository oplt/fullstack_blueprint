"""Compatibility entrypoint for OpenTelemetry setup."""

from __future__ import annotations


def setup_tracing(app, engine=None) -> None:  # type: ignore[type-arg]
    from backend.core.observability.otel import setup_traces

    setup_traces(app)
