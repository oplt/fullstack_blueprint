import unittest

import httpx
import pytest

from backend.api import main
from backend.core.config import settings
from backend.core.middleware import public_rate_limit


@pytest.mark.asyncio
async def test_cors_preflight_and_csrf_rejection_keep_security_and_correlation_headers(monkeypatch):
    async def increment(_key, _window):
        return 1, 60

    monkeypatch.setattr(public_rate_limit, "_increment_with_ttl", increment)
    origin = settings.allowed_origins[0]
    transport = httpx.ASGITransport(app=main.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        preflight = await client.options(
            "/api/v1/auth/logout",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "authorization,idempotency-key,x-request-id",
            },
        )
        rejected = await client.post(
            "/api/v1/auth/logout",
            headers={
                "Origin": origin,
                "Cookie": f"{settings.ACCESS_COOKIE_NAME}=session",
            },
        )

    testcase = unittest.TestCase()
    testcase.assertEqual(preflight.status_code, 200)
    testcase.assertIn("idempotency-key", preflight.headers["access-control-allow-headers"].lower())
    testcase.assertTrue(preflight.headers["x-request-id"])
    testcase.assertEqual(preflight.headers["x-content-type-options"], "nosniff")
    testcase.assertEqual(rejected.status_code, 403)
    testcase.assertEqual(rejected.headers["access-control-allow-origin"], origin)
    testcase.assertTrue(rejected.headers["x-request-id"])
    testcase.assertEqual(rejected.headers["x-content-type-options"], "nosniff")
