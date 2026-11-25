from __future__ import annotations

import asyncio
import json
import unittest

from backend.modules.ai.contracts import (
    AiCapability,
    AiMessage,
    AiMessageRole,
    AiProviderRequest,
    AiRunStartedEvent,
    AiTaskType,
)
from backend.modules.ai.errors import AiErrorKind, classify_http_status
from backend.modules.ai.providers import LocalHeuristicProvider
from backend.modules.ai.routing import ModelRegistry, ModelSpec, RoutingPolicy, estimate_cost_micros
from backend.modules.ai.streaming import AiStreamingService, sse_encode


class Phase05RoutingTests(unittest.TestCase):
    def test_routing_is_deterministic_and_respects_capabilities(self) -> None:
        registry = ModelRegistry(
            (
                ModelSpec(
                    provider_key="slow",
                    model_id="expensive",
                    label="Expensive",
                    capabilities=frozenset({AiCapability.TEXT, AiCapability.STREAMING}),
                    context_window=1000,
                    max_output_tokens=100,
                    input_cost_per_million=10,
                    output_cost_per_million=10,
                    reliability_score=100,
                ),
                ModelSpec(
                    provider_key="fast",
                    model_id="cheap",
                    label="Cheap",
                    capabilities=frozenset({AiCapability.TEXT, AiCapability.STREAMING}),
                    context_window=1000,
                    max_output_tokens=100,
                    input_cost_per_million=1,
                    output_cost_per_million=1,
                    reliability_score=90,
                ),
            )
        )

        selected = registry.route(
            AiTaskType.GENERATION,
            policy=RoutingPolicy(required_capabilities=frozenset({AiCapability.STREAMING})),
        )

        self.assertEqual(selected.key, "fast:cheap")
        self.assertEqual(estimate_cost_micros(selected, input_tokens=1000, output_tokens=500), 0)

    def test_provider_statuses_are_classified_without_response_body_leaks(self) -> None:
        self.assertEqual(classify_http_status(429), (AiErrorKind.RATE_LIMIT, True))
        self.assertEqual(classify_http_status(401), (AiErrorKind.AUTHENTICATION, False))
        self.assertEqual(classify_http_status(422), (AiErrorKind.INVALID_REQUEST, False))


class Phase05ProviderAndStreamingTests(unittest.IsolatedAsyncioTestCase):
    async def test_local_structured_output_uses_application_contract(self) -> None:
        request = AiProviderRequest(
            model="local-heuristic",
            messages=[
                AiMessage(role=AiMessageRole.SYSTEM, content="Return JSON."),
                AiMessage(role=AiMessageRole.USER, content="Answer."),
            ],
            response_format="json",
        )

        response = await LocalHeuristicProvider().generate_contract(request)

        self.assertTrue(response.output_json)
        self.assertEqual(
            response.usage.total_tokens, response.usage.input_tokens + response.usage.output_tokens
        )
        self.assertIsNotNone(response.provider_request_id)

    async def test_stream_is_versioned_and_emits_completion(self) -> None:
        request = AiProviderRequest(
            model="local-heuristic",
            messages=[AiMessage(role=AiMessageRole.USER, content="Hello")],
            metadata={"run_id": "run-1"},
        )
        events = [
            event
            async for event in AiStreamingService(heartbeat_seconds=60).stream(
                LocalHeuristicProvider(), request
            )
        ]

        self.assertEqual(events[0].type, "run.started")
        self.assertEqual(events[-1].type, "run.completed")
        self.assertTrue(all(event.protocol_version == "1" for event in events))

    async def test_stream_cancellation_closes_the_provider_iterator(self) -> None:
        class BlockingProvider(LocalHeuristicProvider):
            async def stream_contract(self, request):
                yield AiRunStartedEvent(
                    run_id="run-1", sequence=0, provider_key="local", model=request.model
                )
                await asyncio.Event().wait()

        request = AiProviderRequest(
            model="local-heuristic",
            messages=[AiMessage(role=AiMessageRole.USER, content="Hello")],
            metadata={"run_id": "run-1"},
        )

        task = asyncio.create_task(self._collect_stream(BlockingProvider(), request))
        await asyncio.sleep(0)
        task.cancel()
        with self.assertRaises(asyncio.CancelledError):
            await task

    @staticmethod
    async def _collect_stream(provider, request):
        return [
            event
            async for event in AiStreamingService(heartbeat_seconds=60).stream(provider, request)
        ]

    def test_sse_encoding_is_json_and_protocol_stable(self) -> None:
        encoded = sse_encode(
            AiRunStartedEvent(run_id="run-1", sequence=0, provider_key="local", model="local")
        )
        payload = json.loads(encoded.split("data: ", 1)[1].strip())

        self.assertEqual(encoded.splitlines()[0], "event: run.started")
        self.assertEqual(payload["protocol_version"], "1")
        self.assertEqual(payload["run_id"], "run-1")
