from uuid import UUID

import httpx
import pytest
from fastapi import FastAPI, Request

from backend.core.middleware import public_rate_limit
from backend.core.middleware.correlation_id import CorrelationIdMiddleware
from backend.core.middleware.public_rate_limit import PublicRateLimitMiddleware
from backend.core.middleware.security_headers import SecurityHeadersMiddleware


def _app() -> FastAPI:
    app = FastAPI()
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(CorrelationIdMiddleware)

    @app.get("/api/v1/private")
    async def private_response(request: Request):
        return {"correlation_id": request.state.correlation_id}

    return app


@pytest.mark.asyncio
async def test_private_api_response_is_not_stored() -> None:
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=_app()), base_url="http://test"
    ) as client:
        response = await client.get("/api/v1/private")

    assert response.headers["cache-control"] == "no-store"


@pytest.mark.asyncio
async def test_untrusted_correlation_id_is_replaced_before_echoing() -> None:
    invalid_id = "a" * 256
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=_app()), base_url="http://test"
    ) as client:
        response = await client.get("/api/v1/private", headers={"X-Correlation-ID": invalid_id})

    correlation_id = response.headers["x-correlation-id"]
    assert correlation_id != invalid_id
    assert response.json()["correlation_id"] == correlation_id
    UUID(correlation_id)


@pytest.mark.asyncio
async def test_safe_correlation_id_is_preserved() -> None:
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=_app()), base_url="http://test"
    ) as client:
        response = await client.get(
            "/api/v1/private", headers={"X-Request-ID": "gateway.request-42"}
        )

    assert response.headers["x-request-id"] == "gateway.request-42"


@pytest.mark.asyncio
async def test_production_public_rate_limit_cannot_be_disabled(monkeypatch) -> None:
    monkeypatch.setattr(public_rate_limit.settings, "APP_ENV", "production")
    monkeypatch.setattr(public_rate_limit.settings, "PUBLIC_RATE_LIMIT_REQUESTS", 0)
    app = FastAPI()
    app.add_middleware(PublicRateLimitMiddleware)

    @app.get("/api/v1/private")
    async def private_response():
        return {"allowed": True}

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/v1/private")

    assert response.status_code == 503
