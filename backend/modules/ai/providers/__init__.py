"""Provider adapters and registry."""

from backend.modules.ai.providers.anthropic import AnthropicProvider
from backend.modules.ai.providers.common import (
    BaseAiProvider,
    HttpAiProvider,
    close_ai_provider_http_clients,
)
from backend.modules.ai.providers.local import LocalHeuristicProvider
from backend.modules.ai.providers.openai import OpenAICompatibleProvider, OpenAIProvider
from backend.modules.ai.providers.registry import AiProviderRegistry

__all__ = [
    "AiProviderRegistry",
    "AnthropicProvider",
    "BaseAiProvider",
    "HttpAiProvider",
    "LocalHeuristicProvider",
    "OpenAICompatibleProvider",
    "OpenAIProvider",
    "close_ai_provider_http_clients",
]
