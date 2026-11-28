"""Canonical application boundary for model execution.

Business modules use this gateway for generation, streaming, and embeddings.
Provider adapters remain responsible for translating the application contract
to each provider's SDK or HTTP API.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

from backend.modules.ai.contracts import (
    AiCapability,
    AiProviderRequest,
    AiProviderResponse,
    AiStreamEvent,
    AiTaskType,
)
from backend.modules.ai.errors import AiErrorKind, AiProviderError
from backend.modules.ai.providers import AiProviderRegistry, BaseAiProvider
from backend.modules.ai.routing import ModelRegistry, ModelSpec, RoutingPolicy
from backend.modules.ai.schemas import AiProviderDescriptor
from backend.modules.ai.streaming import AiStreamingService


class AiModelGateway:
    """Select models and execute typed operations through provider adapters."""

    def __init__(
        self,
        *,
        providers: AiProviderRegistry | None = None,
        models: ModelRegistry | None = None,
    ) -> None:
        self.providers = providers or AiProviderRegistry()
        self.models = models or ModelRegistry()

    @staticmethod
    def list_provider_descriptors() -> list[AiProviderDescriptor]:
        return [
            AiProviderDescriptor(**descriptor) for descriptor in AiProviderRegistry().descriptors()
        ]

    def select(
        self,
        task: AiTaskType,
        *,
        policy: RoutingPolicy | None = None,
        provider_key: str | None = None,
        model: str | None = None,
    ) -> tuple[BaseAiProvider, ModelSpec | None, str]:
        if provider_key or model:
            provider = self.providers.get(provider_key)
            selected_model = (
                model
                or self.models.route(
                    task,
                    policy=policy,
                    requested_provider=provider.key,
                ).model_id
            )
            spec = self._registered_spec(provider.key, selected_model)
            if spec is not None:
                self._require_capability(spec, task)
            return provider, spec, selected_model

        spec = self.models.route(task, policy=policy)
        return self.providers.get(spec.provider_key), spec, spec.model_id

    async def generate(
        self,
        request: AiProviderRequest,
        *,
        policy: RoutingPolicy | None = None,
    ) -> AiProviderResponse:
        task = (
            AiTaskType.TOOL_USE
            if request.tools
            else (
                AiTaskType.STRUCTURED
                if request.response_format == "json"
                else AiTaskType.GENERATION
            )
        )
        provider, spec, model = self.select(
            task,
            policy=policy,
            provider_key=request.metadata.get("provider_key"),
            model=request.model,
        )
        self._check_cancellation(request)
        normalized = request.model_copy(update={"model": model})
        response = await provider.generate_contract(normalized)
        return self._add_cost(response, spec)

    async def generate_contract(self, request: AiProviderRequest) -> AiProviderResponse:
        """Compatibility method for the agent provider-port contract."""

        return await self.generate(request)

    def stream(
        self,
        request: AiProviderRequest,
        *,
        policy: RoutingPolicy | None = None,
    ) -> AsyncIterator[AiStreamEvent]:
        async def _stream() -> AsyncIterator[AiStreamEvent]:
            provider, _spec, model = self.select(
                AiTaskType.TOOL_USE if request.tools else AiTaskType.GENERATION,
                policy=policy,
                provider_key=request.metadata.get("provider_key"),
                model=request.model,
            )
            self._check_cancellation(request)
            normalized = request.model_copy(update={"model": model})
            async for event in AiStreamingService().stream(provider, normalized):
                self._check_cancellation(request)
                yield event

        return _stream()

    async def embed_texts(
        self,
        texts: list[str],
        *,
        provider_key: str,
        model: str | None = None,
    ) -> list[list[float]]:
        provider = self.providers.get(provider_key)
        return await provider.embed_texts(texts, model=model)

    def _registered_spec(self, provider_key: str, model: str) -> ModelSpec | None:
        try:
            return self.models.get(provider_key, model)
        except AiProviderError as exc:
            if exc.kind == AiErrorKind.INVALID_REQUEST:
                return None
            raise

    @staticmethod
    def _require_capability(spec: ModelSpec, task: AiTaskType) -> None:
        required = {
            AiTaskType.EMBEDDING: AiCapability.EMBEDDINGS,
            AiTaskType.STRUCTURED: AiCapability.STRUCTURED_OUTPUT,
            AiTaskType.TOOL_USE: AiCapability.TOOL_CALLING,
            AiTaskType.MULTIMODAL: AiCapability.MULTIMODAL,
            AiTaskType.REASONING: AiCapability.REASONING,
        }.get(task, AiCapability.TEXT)
        if required not in spec.capabilities:
            raise AiProviderError(
                "Requested model does not support this operation",
                kind=AiErrorKind.INVALID_REQUEST,
                provider_key=spec.provider_key,
            )

    @staticmethod
    def _check_cancellation(request: AiProviderRequest) -> None:
        event = request.cancellation_event
        if event is not None and event.is_set():
            raise AiProviderError(
                "AI request cancelled",
                kind=AiErrorKind.CANCELLED,
                provider_key=request.metadata.get("provider_key", "unknown"),
            )

    @staticmethod
    def _add_cost(
        response: AiProviderResponse,
        spec: ModelSpec | None,
    ) -> AiProviderResponse:
        if spec is None:
            return response
        cost_micros = round(
            (
                response.usage.input_tokens * spec.input_cost_per_million
                + response.usage.output_tokens * spec.output_cost_per_million
            )
            / 1_000_000
        )
        return response.model_copy(
            update={"raw_metadata": {**response.raw_metadata, "cost_micros": cost_micros}}
        )


__all__ = ["AiModelGateway"]
