import unittest
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from backend.core import rate_limit


@pytest.mark.asyncio
async def test_check_rate_limit_uses_atomic_increment_and_positive_retry_after(monkeypatch):
    client = AsyncMock()
    client.eval.return_value = [3, 0]
    monkeypatch.setattr(rate_limit, "get_redis_client", lambda: client)

    with pytest.raises(HTTPException) as error:
        await rate_limit.check_rate_limit("rate_limit:test", 2, 60)

    unittest.TestCase().assertEqual(error.value.status_code, 429)
    unittest.TestCase().assertEqual(error.value.headers["Retry-After"], "1")
    client.eval.assert_awaited_once()


@pytest.mark.asyncio
async def test_invalid_rate_limit_window_is_rejected_before_redis(monkeypatch):
    client = AsyncMock()
    monkeypatch.setattr(rate_limit, "get_redis_client", lambda: client)

    with pytest.raises(ValueError):
        await rate_limit.check_rate_limit("rate_limit:test", 1, 0)

    client.eval.assert_not_awaited()


@pytest.mark.asyncio
async def test_rate_limit_redis_failure_follows_fail_closed_setting(monkeypatch):
    client = AsyncMock()
    client.eval.side_effect = ConnectionError("unreachable")
    monkeypatch.setattr(rate_limit, "get_redis_client", lambda: client)
    monkeypatch.setattr(rate_limit.settings, "RATE_LIMIT_FAIL_OPEN", False)

    with pytest.raises(HTTPException) as error:
        await rate_limit.check_rate_limit("rate_limit:test", 1, 60)

    unittest.TestCase().assertEqual(error.value.status_code, 503)


def test_auth_rate_limit_keys_hash_normalized_email():
    request = Request({"type": "http", "client": ("192.0.2.1", 443)})

    key = rate_limit.auth_rate_limit_key(request, " Alice@Example.com ", namespace="auth_fail")

    testcase = unittest.TestCase()
    testcase.assertTrue(key.startswith("rate_limit:auth_fail:192.0.2.1:"))
    testcase.assertNotIn("Alice", key)
    testcase.assertEqual(
        key,
        rate_limit.auth_rate_limit_key(request, "alice@example.COM", namespace="auth_fail"),
    )
