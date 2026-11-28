from types import SimpleNamespace

import httpx
import pytest
from backend.core.db import pool_observability
from core.observability import metrics as metrics_module
from fastapi import FastAPI
from prometheus_client import generate_latest
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool


def histogram_count(scrape: str, metric: str, **labels: str) -> float:
    label_values = ",".join(f'{key}="{value}"' for key, value in labels.items())
    for line in scrape.splitlines():
        if line.startswith(f"{metric}_count{{") and label_values in line:
            return float(line.rsplit(" ", maxsplit=1)[-1])
    return 0


@pytest.mark.asyncio
async def test_request_latency_uses_route_template_for_path_parameters(monkeypatch):
    monkeypatch.setattr(
        metrics_module,
        "load_config",
        lambda: SimpleNamespace(
            prometheus_metrics_enabled=True,
            prometheus_metrics_path="/metrics",
        ),
    )
    app = FastAPI()
    metrics_module.setup_metrics(app)

    @app.get("/items/{item_id}")
    async def get_item(item_id: str):
        return {"item_id": item_id}

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        initial_count = histogram_count(
            generate_latest().decode(),
            "http_request_duration_seconds",
            method="GET",
            route="/items/{item_id}",
        )
        assert (await client.get("/items/first-private-id")).status_code == 200
        assert (await client.get("/items/second-private-id")).status_code == 200
        final_scrape = generate_latest().decode()

    assert (
        histogram_count(
            final_scrape, "http_request_duration_seconds", method="GET", route="/items/{item_id}"
        )
        - initial_count
        == 2
    )
    assert 'route="/items/first-private-id"' not in final_scrape
    assert 'route="/items/second-private-id"' not in final_scrape


@pytest.mark.asyncio
async def test_unmatched_request_uses_bounded_metric_label(monkeypatch):
    monkeypatch.setattr(
        metrics_module,
        "load_config",
        lambda: SimpleNamespace(
            prometheus_metrics_enabled=True,
            prometheus_metrics_path="/metrics",
        ),
    )
    app = FastAPI()
    metrics_module.setup_metrics(app)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        initial_count = histogram_count(
            generate_latest().decode(),
            "http_request_duration_seconds",
            method="GET",
            route="unmatched",
        )
        response = await client.get("/not-a-route/private-value")
        final_scrape = generate_latest().decode()

    assert response.status_code == 404
    assert (
        histogram_count(
            final_scrape, "http_request_duration_seconds", method="GET", route="unmatched"
        )
        - initial_count
        == 1
    )
    assert 'route="/not-a-route/private-value"' not in final_scrape


def test_database_request_metrics_count_queries_and_connection_hold_time():
    observe_request = getattr(pool_observability, "observe_database_request", None)
    assert callable(observe_request), "request-scoped DB profiling must be available"

    route = "/items/{item_id}"
    before = generate_latest().decode()
    engine = create_engine(
        "sqlite://",
        poolclass=QueuePool,
        pool_size=1,
        max_overflow=0,
    )
    pool_observability.instrument_engine(role="api", sync_engine=engine)
    try:
        with (
            observe_request(role="api", route=route) as request_metrics,
            engine.connect() as connection,
        ):
            connection.exec_driver_sql("select 1")
            connection.exec_driver_sql("select 2")

        after = generate_latest().decode()
    finally:
        engine.dispose()

    assert request_metrics.query_count == 2
    assert (
        histogram_count(
            after,
            "database_request_query_count",
            role="api",
            route=route,
        )
        - histogram_count(
            before,
            "database_request_query_count",
            role="api",
            route=route,
        )
        == 1
    )
    assert (
        histogram_count(
            after,
            "database_connection_hold_seconds",
            role="api",
            route=route,
        )
        - histogram_count(
            before,
            "database_connection_hold_seconds",
            role="api",
            route=route,
        )
        == 1
    )
