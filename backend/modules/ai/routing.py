"""Deterministic model registry and capability-aware routing."""

from __future__ import annotations

import json
from dataclasses import dataclass

from backend.core.config import settings
from backend.modules.ai.contracts import AiCapability, AiTaskType
from backend.modules.ai.errors import AiErrorKind, AiProviderError


@dataclass(frozen=True, slots=True)
class ModelSpec:
    provider_key: str
    model_id: str
    label: str
    capabilities: frozenset[AiCapability]
    context_window: int
    max_output_tokens: int
    input_cost_per_million: int = 0
    output_cost_per_million: int = 0
    version: str | None = None
    available: bool = True
    regions: frozenset[str] = frozenset()
    reliability_score: int = 100
    latency_ms: int = 0

    @property
    def key(self) -> str:
        return f"{self.provider_key}:{self.model_id}"


@dataclass(frozen=True, slots=True)
class RoutingPolicy:
    required_capabilities: frozenset[AiCapability] = frozenset()
    cost_budget_micros: int | None = None
    max_latency_ms: int | None = None
    region: str | None = None
    allowed_providers: frozenset[str] = frozenset()
    tenant_id: str | None = None


def _default_specs() -> tuple[ModelSpec, ...]:
    return (
        ModelSpec(
            "local",
            settings.AI_LOCAL_MODEL_NAME,
            "Local heuristic",
            frozenset({AiCapability.TEXT, AiCapability.STRUCTURED_OUTPUT, AiCapability.EMBEDDINGS}),
            32_000,
            settings.AI_MAX_OUTPUT_TOKENS,
        ),
        ModelSpec(
            "openai",
            settings.OPENAI_DEFAULT_MODEL,
            "OpenAI default",
            frozenset(
                {
                    AiCapability.TEXT,
                    AiCapability.STRUCTURED_OUTPUT,
                    AiCapability.STREAMING,
                    AiCapability.TOOL_CALLING,
                    AiCapability.EMBEDDINGS,
                    AiCapability.MULTIMODAL,
                    AiCapability.REASONING,
                }
            ),
            128_000,
            settings.AI_MAX_OUTPUT_TOKENS,
            version="responses",
        ),
        ModelSpec(
            "anthropic",
            settings.ANTHROPIC_DEFAULT_MODEL,
            "Anthropic default",
            frozenset(
                {
                    AiCapability.TEXT,
                    AiCapability.STRUCTURED_OUTPUT,
                    AiCapability.STREAMING,
                    AiCapability.TOOL_CALLING,
                    AiCapability.MULTIMODAL,
                    AiCapability.REASONING,
                }
            ),
            200_000,
            settings.AI_MAX_OUTPUT_TOKENS,
        ),
        ModelSpec(
            "openai_compatible",
            settings.AI_COMPATIBLE_DEFAULT_MODEL,
            "OpenAI-compatible server",
            frozenset(
                {
                    AiCapability.TEXT,
                    AiCapability.STRUCTURED_OUTPUT,
                    AiCapability.STREAMING,
                    AiCapability.TOOL_CALLING,
                    AiCapability.MULTIMODAL,
                }
            ),
            32_000,
            settings.AI_MAX_OUTPUT_TOKENS,
        ),
    )


class ModelRegistry:
    def __init__(self, specs: tuple[ModelSpec, ...] | None = None) -> None:
        self._specs = {spec.key: spec for spec in (specs or self._load_specs())}

    @staticmethod
    def _load_specs() -> tuple[ModelSpec, ...]:
        raw = settings.AI_MODEL_REGISTRY_JSON.strip()
        if not raw:
            return _default_specs()
        try:
            payload = json.loads(raw)
            return tuple(
                ModelSpec(
                    provider_key=item["provider_key"],
                    model_id=item["model_id"],
                    label=item.get("label", item["model_id"]),
                    capabilities=frozenset(AiCapability(value) for value in item["capabilities"]),
                    context_window=int(item.get("context_window", 0)),
                    max_output_tokens=int(item.get("max_output_tokens", 1024)),
                    input_cost_per_million=int(item.get("input_cost_per_million", 0)),
                    output_cost_per_million=int(item.get("output_cost_per_million", 0)),
                    version=item.get("version"),
                    available=bool(item.get("available", True)),
                    regions=frozenset(item.get("regions", [])),
                    reliability_score=int(item.get("reliability_score", 100)),
                    latency_ms=int(item.get("latency_ms", 0)),
                )
                for item in payload
            )
        except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
            raise AiProviderError(
                "AI_MODEL_REGISTRY_JSON is invalid",
                kind=AiErrorKind.CONFIGURATION,
                retryable=False,
            ) from exc

    def all(self) -> tuple[ModelSpec, ...]:
        return tuple(sorted(self._specs.values(), key=lambda item: item.key))

    def get(self, provider_key: str, model_id: str) -> ModelSpec:
        try:
            return self._specs[f"{provider_key}:{model_id}"]
        except KeyError as exc:
            raise AiProviderError(
                "Requested AI model is not registered",
                kind=AiErrorKind.INVALID_REQUEST,
                provider_key=provider_key,
            ) from exc

    def route(
        self,
        task: AiTaskType,
        *,
        policy: RoutingPolicy | None = None,
        requested_provider: str | None = None,
        requested_model: str | None = None,
    ) -> ModelSpec:
        policy = policy or RoutingPolicy()
        required = set(policy.required_capabilities)
        required.add(AiCapability.EMBEDDINGS if task == AiTaskType.EMBEDDING else AiCapability.TEXT)
        if task == AiTaskType.STRUCTURED:
            required.add(AiCapability.STRUCTURED_OUTPUT)
        if task == AiTaskType.TOOL_USE:
            required.add(AiCapability.TOOL_CALLING)
        if task == AiTaskType.MULTIMODAL:
            required.add(AiCapability.MULTIMODAL)
        if task == AiTaskType.REASONING:
            required.add(AiCapability.REASONING)
        candidates = [
            spec
            for spec in self._specs.values()
            if spec.available
            and required.issubset(spec.capabilities)
            and (not requested_provider or spec.provider_key == requested_provider)
            and (not requested_model or spec.model_id == requested_model)
            and (not policy.allowed_providers or spec.provider_key in policy.allowed_providers)
            and (not policy.region or not spec.regions or policy.region in spec.regions)
            and (
                not settings.AI_ALLOWED_REGIONS
                or not spec.regions
                or bool(spec.regions.intersection(settings.AI_ALLOWED_REGIONS))
            )
            and (
                policy.max_latency_ms is None
                or not spec.latency_ms
                or spec.latency_ms <= policy.max_latency_ms
            )
            and (
                policy.cost_budget_micros is None
                or spec.input_cost_per_million + spec.output_cost_per_million
                <= policy.cost_budget_micros
            )
        ]
        if not candidates:
            raise AiProviderError(
                "No AI model satisfies the requested capabilities and policy",
                kind=AiErrorKind.INVALID_REQUEST,
                provider_key=requested_provider or "router",
            )
        return min(
            candidates,
            key=lambda spec: (
                spec.input_cost_per_million + spec.output_cost_per_million,
                -spec.reliability_score,
                spec.latency_ms or 2**31,
                spec.key,
            ),
        )


def estimate_cost_micros(spec: ModelSpec, *, input_tokens: int, output_tokens: int) -> int:
    return round(
        (input_tokens * spec.input_cost_per_million + output_tokens * spec.output_cost_per_million)
        / 1_000_000
    )
