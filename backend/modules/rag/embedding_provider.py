from __future__ import annotations

import logging

from backend.modules.ai.gateway import AiModelGateway
from backend.modules.rag.config import RagConfig

logger = logging.getLogger(__name__)


class LangChainEmbeddingAdapter:
    """Embedding adapter — uses existing AI provider registry, not hardcoded OpenAI."""

    def __init__(self, config: RagConfig | None = None):
        self.config = config or RagConfig.from_settings()
        self._gateway = AiModelGateway()

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        return await self._gateway.embed_texts(
            texts,
            provider_key=self.config.embedding_provider,
            model=self.config.embedding_model,
        )
