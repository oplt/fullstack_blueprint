"""Configured provider selection and embedding entry points."""

from __future__ import annotations

from typing import Any

from backend.core.config import settings
from backend.modules.ai.contracts import AiCapability
from backend.modules.ai.errors import AiErrorKind, AiProviderError
from backend.modules.ai.providers.anthropic import AnthropicProvider
from backend.modules.ai.providers.common import BaseAiProvider
from backend.modules.ai.providers.local import LocalHeuristicProvider
from backend.modules.ai.providers.openai import OpenAICompatibleProvider, OpenAIProvider


class AiProviderRegistry:
    def __init__(self):
        providers: list[BaseAiProvider] = [
            LocalHeuristicProvider(),
            OpenAIProvider(),
            AnthropicProvider(),
        ]
        if settings.AI_COMPATIBLE_BASE_URL:
            providers.append(OpenAICompatibleProvider())
        self._providers = {provider.key: provider for provider in providers}

    def get(self, key: str | None) -> BaseAiProvider:
        provider_key = (key or settings.AI_DEFAULT_PROVIDER).strip().lower()
        provider = self._providers.get(provider_key)
        if not provider:
            raise AiProviderError(
                f"Unknown AI provider: {provider_key}",
                kind=AiErrorKind.INVALID_REQUEST,
                provider_key=provider_key,
            )
        return provider

    def descriptors(self) -> list[dict[str, Any]]:
        return [
            {
                "key": provider.key,
                "label": provider.key.replace("_", " ").title(),
                "supports_generation": AiCapability.TEXT in provider.capabilities,
                "supports_embeddings": AiCapability.EMBEDDINGS in provider.capabilities,
                "capabilities": sorted(capability.value for capability in provider.capabilities),
            }
            for provider in sorted(self._providers.values(), key=lambda item: item.key)
        ]

    def embedding_provider_and_model(self) -> tuple[BaseAiProvider, str]:
        provider = self.get(
            settings.AI_EMBEDDING_PROVIDER or settings.RAG_EMBEDDING_PROVIDER or "local"
        )
        model = (
            settings.OPENAI_EMBEDDING_MODEL
            if provider.key == "openai"
            else settings.AI_LOCAL_MODEL_NAME
        )
        return provider, model

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        provider, model = self.embedding_provider_and_model()
        return await provider.embed_texts(texts, model=model)
