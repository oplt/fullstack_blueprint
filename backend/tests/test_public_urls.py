import asyncio
from unittest.mock import AsyncMock, patch

import httpx

from backend.core.config import settings
from backend.core.observability.service import ObservabilityService, build_public_url


def test_public_url_rejects_credentials_and_url_controls() -> None:
    assert build_public_url("https://user:password@example.com") is None
    assert build_public_url("https://example.com\r\n.evil.test") is None
    assert build_public_url("https://example.com", "//evil.test") == "https://example.com/evil.test"


def test_public_url_joins_configured_path() -> None:
    assert build_public_url("https://example.com/monitoring/", "/graph") == (
        "https://example.com/monitoring/graph"
    )


def test_http_status_only_marks_successful_responses_healthy() -> None:
    service = ObservabilityService(settings)

    async def response(status_code: int):
        with patch(
            "backend.core.observability.service._get_observability_http_client"
        ) as get_client:
            get_client.return_value.get = AsyncMock(
                return_value=httpx.Response(
                    status_code, request=httpx.Request("GET", "https://example.com")
                )
            )
            return await service._http_status("https://example.com", "Grafana", "now")

    assert asyncio.run(response(401)).status == "degraded"
    assert asyncio.run(response(200)).status == "healthy"
