"""Compatibility entrypoint for OpenTelemetry setup."""

from __future__ import annotations


def setup_tracing(
    app,
    engine=None,  # noqa: ARG001 - engine reserved in public observability signature
) -> None:  # type: ignore[type-arg]
    from backend.core.observability.otel import setup_traces  # noqa: PLC0415 - optional telemetry

    setup_traces(app)
