from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import jwt
import pytest
from backend.core.middleware.csrf import CSRFMiddleware
from backend.core.config import Settings, settings
from backend.core.security import decode_token
from backend.modules.identity.dependencies import _get_authenticated_user
from backend.modules.identity import auth_routes as identity_router
from backend.modules.identity.repository import IdentityRepository
from backend.modules.identity.schemas import SignInRequest
from fastapi import HTTPException
from pydantic import ValidationError
from starlette.requests import Request
from starlette.responses import Response

TEST_SIGNING_KEY = secrets.token_urlsafe(48)


def _request(path: str, headers: dict[str, str]) -> Request:
    return Request(
        {
            "type": "http",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "method": "POST",
            "scheme": "https",
            "path": path,
            "raw_path": path.encode(),
            "query_string": b"",
            "headers": [(key.lower().encode(), value.encode()) for key, value in headers.items()],
            "client": ("192.0.2.10", 1234),
            "server": ("app.example", 443),
        }
    )


@pytest.mark.asyncio
async def test_login_rejects_untrusted_origin_before_auth_handler() -> None:
    called = False

    async def call_next(_request: Request) -> Response:
        nonlocal called
        called = True
        return Response(status_code=204)

    response = await CSRFMiddleware(lambda _scope, _receive, _send: None).dispatch(
        _request("/api/v1/auth/sign-in", {"Origin": "https://attacker.example"}),
        call_next,
    )

    assert response.status_code == 403
    assert not called


@pytest.mark.asyncio
async def test_login_requires_origin_or_referer_but_accepts_configured_origin() -> None:
    middleware = CSRFMiddleware(lambda _scope, _receive, _send: None)

    async def call_next(_request: Request) -> Response:
        return Response(status_code=204)

    missing = await middleware.dispatch(_request("/api/v1/auth/sign-in", {}), call_next)
    allowed = await middleware.dispatch(
        _request("/api/v1/auth/sign-in", {"Origin": settings.allowed_origins[0]}), call_next
    )
    referer = await middleware.dispatch(
        _request(
            "/api/v1/auth/sign-in",
            {"Referer": f"{settings.allowed_origins[0]}/account/sign-in?source=email"},
        ),
        call_next,
    )

    assert missing.status_code == 403
    assert allowed.status_code == 204
    assert referer.status_code == 204


@pytest.mark.asyncio
async def test_wrong_token_type_is_rejected_before_database_reads(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "backend.modules.identity.dependencies.decode_token",
        lambda _token: {"sub": "user-1", "sid": "session-1", "type": "refresh"},
    )
    db = AsyncMock()

    with pytest.raises(HTTPException) as error:
        await _get_authenticated_user("signed-token", db)

    assert error.value.status_code == 401
    db.execute.assert_not_awaited()


def test_jwt_decoder_requires_expiry_and_authentication_claims() -> None:
    token = jwt.encode(
        {"sub": "user-1", "sid": "session-1", "type": "access"},
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )

    with pytest.raises(jwt.MissingRequiredClaimError):
        decode_token(token)


def test_jwt_decoder_rejects_expired_access_token() -> None:
    token = jwt.encode(
        {
            "sub": "user-1",
            "sid": "session-1",
            "type": "access",
            "exp": datetime.now(UTC) - timedelta(minutes=1),
        },
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )

    with pytest.raises(jwt.ExpiredSignatureError):
        decode_token(token)


@pytest.mark.parametrize("algorithm", ["none", "RS256", "HS1"])
def test_jwt_settings_reject_unsupported_algorithms(algorithm: str) -> None:
    with pytest.raises(ValidationError):
        Settings(
            APP_ENV="test",
            DATABASE_URL="postgresql+asyncpg://test@localhost/test",
            REDIS_URL="redis://localhost:6379/0",
            JWT_SECRET=TEST_SIGNING_KEY,
            JWT_ALGORITHM=algorithm,
            ACCESS_TOKEN_EXPIRE_MINUTES=15,
            REFRESH_TOKEN_EXPIRE_DAYS=7,
        )


def test_jwt_settings_reject_repeated_low_entropy_secret() -> None:
    with pytest.raises(ValidationError):
        Settings(
            APP_ENV="test",
            DATABASE_URL="postgresql+asyncpg://test@localhost/test",
            REDIS_URL="redis://localhost:6379/0",
            JWT_SECRET="a" * 64,
            JWT_ALGORITHM="HS256",
            ACCESS_TOKEN_EXPIRE_MINUTES=15,
            REFRESH_TOKEN_EXPIRE_DAYS=7,
        )


@pytest.mark.asyncio
async def test_mfa_attempts_are_limited_by_account_and_client(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[tuple[str, int, int]] = []

    async def record_limit(*, key: str, max_attempts: int, window_seconds: int) -> None:
        calls.append((key, max_attempts, window_seconds))

    monkeypatch.setattr(identity_router, "check_rate_limit", record_limit)
    await identity_router._check_mfa_attempt_rate_limit(
        _request("/api/v1/auth/mfa/verify", {}), SimpleNamespace(id="account-42"), "verify"
    )

    assert len(calls) == 2
    assert all(limit == 5 and window == 300 for _, limit, window in calls)
    assert any(":account:" in key for key, _, _ in calls)
    assert any(":client:192.0.2.10" in key for key, _, _ in calls)


@pytest.mark.asyncio
async def test_signin_failure_counts_account_and_client(monkeypatch: pytest.MonkeyPatch) -> None:
    enforced: list[str] = []
    incremented: list[str] = []

    async def no_limit(**_kwargs) -> None:
        return None

    async def record_enforce(key: str, _max_attempts: int) -> None:
        enforced.append(key)

    async def record_increment(key: str, _window_seconds: int) -> int:
        incremented.append(key)
        return 1

    class FailedSignIn:
        def __init__(self, _db) -> None:
            pass

        async def sign_in(self, *_args):
            raise HTTPException(status_code=401, detail="Invalid credentials")

    monkeypatch.setattr(identity_router, "check_rate_limit", no_limit)
    monkeypatch.setattr(identity_router, "enforce_rate_limit", record_enforce)
    monkeypatch.setattr(identity_router, "increment_rate_limit", record_increment)
    monkeypatch.setattr(identity_router, "IdentityService", FailedSignIn)
    request = _request("/api/v1/auth/sign-in", {"Origin": settings.allowed_origins[0]})
    invalid_credential = "bad-password"

    with pytest.raises(HTTPException):
        await identity_router.sign_in(
            SignInRequest(email="person@example.com", password=invalid_credential),
            request,
            Response(),
            MagicMock(),
        )

    assert len(enforced) == 3
    assert len(incremented) == 3
    assert any(":account:" in key for key in enforced)
    assert any(":client:192.0.2.10" in key for key in enforced)


@pytest.mark.asyncio
async def test_authenticated_user_lookup_joins_active_session_with_user() -> None:
    db = MagicMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=result)

    await IdentityRepository(db).get_user_for_active_session("user-1", "session-1")

    statement = db.execute.await_args.args[0]
    sql = str(statement)
    assert "JOIN refresh_sessions" in sql
    assert "refresh_sessions.is_revoked IS false" in sql
    assert "refresh_sessions.expires_at" in sql
