from unittest.mock import AsyncMock

import pytest
from backend.api.middleware.request_limits import RequestBodyLimitMiddleware
from backend.core.config import Settings, settings
from backend.core.log_redaction import redact_message
from backend.core.rate_limit import check_rate_limit
from fastapi import HTTPException


def test_redaction_removes_authentication_material() -> None:
    message = "Authorization: Bearer super-secret token=abc password=hunter2"
    redacted = redact_message(message)
    assert "super-secret" not in redacted
    assert "hunter2" not in redacted
    assert "[REDACTED]" in redacted


def test_production_settings_require_explicit_security_policy() -> None:
    values = settings.model_dump()
    values.update(
        APP_ENV="production",
        COOKIE_SECURE=True,
        LOG_FORMAT="json",
        RATE_LIMIT_FAIL_OPEN=False,
        FRONTEND_URL="https://app.example.com",
        CORS_ALLOWED_ORIGINS=["https://app.example.com"],
        ALLOWED_HOSTS=["api.example.com"],
    )
    production = Settings.model_validate(values)
    assert production.is_production

    values["ALLOWED_HOSTS"] = []
    with pytest.raises(ValueError, match="ALLOWED_HOSTS"):
        Settings.model_validate(values)


@pytest.mark.asyncio
async def test_rate_limit_can_fail_closed_when_redis_is_unavailable(monkeypatch) -> None:
    monkeypatch.setattr(settings, "RATE_LIMIT_FAIL_OPEN", False)
    monkeypatch.setattr(
        "backend.core.rate_limit.redis_client.incr",
        AsyncMock(side_effect=ConnectionError),
    )
    with pytest.raises(HTTPException) as error:
        await check_rate_limit("rate_limit:test", 1, 60)
    assert error.value.status_code == 503


@pytest.mark.asyncio
async def test_request_body_limit_rejects_large_content_length(monkeypatch) -> None:
    monkeypatch.setattr(settings, "MAX_REQUEST_BODY_BYTES", 10)
    called = False

    async def app(_scope, _receive, _send):
        nonlocal called
        called = True

    messages: list[dict] = []

    async def send(message):
        messages.append(message)

    scope = {"type": "http", "headers": [(b"content-length", b"11")]}
    await RequestBodyLimitMiddleware(app)(scope, lambda: None, send)
    assert not called
    assert messages[0]["status"] == 413
