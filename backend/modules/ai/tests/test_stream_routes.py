from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import patch

import pytest
from backend.modules.ai.errors import AiProviderError
from backend.modules.ai.providers import LocalHeuristicProvider
from backend.modules.ai.schemas import AiStreamRequest
from backend.modules.ai.stream_routes import stream_ai_run


@pytest.mark.asyncio
async def test_provider_failure_ends_with_sanitized_terminal_sse_event() -> None:
    class FailingProvider(LocalHeuristicProvider):
        def stream_contract(self, _request):
            raise AiProviderError("secret provider response")

    class StreamService:
        async def create_run(self, _user, **kwargs):
            return SimpleNamespace(
                id="run-1",
                model_name=kwargs["model_name"],
                input_tokens=0,
                output_tokens=0,
                provider_request_id=None,
            )

        async def complete_run(self, run, **kwargs):
            run.status = kwargs["status"]

    class ConnectedRequest:
        async def is_disconnected(self):
            return False

    payload = AiStreamRequest(user_prompt="hello")
    with (
        patch(
            "backend.modules.ai.stream_routes.AiProviderRegistry.get",
            return_value=FailingProvider(),
        ),
        patch("backend.modules.ai.stream_routes.AiStreamService", return_value=StreamService()),
    ):
        response = await stream_ai_run(
            payload,
            ConnectedRequest(),
            db=None,
            current_user=SimpleNamespace(id="user-1"),
            _rate_limit=None,
        )
        events = [chunk async for chunk in response.body_iterator]

    body = "".join(events)
    assert "event: run.failed" in body
    assert "AI provider execution failed" in body
    assert "secret provider response" not in body
