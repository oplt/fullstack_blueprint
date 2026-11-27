"""Opt-in Cohere adapter using the shared HTTP and reliability lifecycle."""

from __future__ import annotations

import asyncio
import math

from backend.modules.ai.contracts import AiProviderRequest
from backend.modules.ai.errors import AiErrorKind, AiProviderError
from backend.modules.ai.providers.common import HttpAiProvider
from backend.modules.rag.domain.models import RetrievedChunk

MAX_RERANK_QUERY_CHARS = 4000
MAX_RERANK_DOCUMENT_CHARS = 8192
MAX_RERANK_DOCUMENT_TOKENS = 2048


class CohereReranker(HttpAiProvider):
    name = "cohere"

    def __init__(self, *, api_key: str, model: str) -> None:
        if not api_key.strip() or not model.strip():
            raise RuntimeError("Provider reranking requires a model and an API key")
        super().__init__(base_url="https://api.cohere.com", api_key=api_key, key="cohere-rerank")
        self.version = model

    async def rank(
        self, query: str, chunks: list[RetrievedChunk], *, limit: int
    ) -> list[RetrievedChunk]:
        try:
            payload = await self._post_json(
                "/v2/rerank",
                AiProviderRequest(model=self.version, messages=[]),
                {
                    "model": self.version,
                    "query": query[:MAX_RERANK_QUERY_CHARS],
                    "documents": [chunk.content[:MAX_RERANK_DOCUMENT_CHARS] for chunk in chunks],
                    "top_n": limit,
                    "max_tokens_per_doc": MAX_RERANK_DOCUMENT_TOKENS,
                },
            )
        except AiProviderError as exc:
            if exc.kind == AiErrorKind.CANCELLED:
                raise asyncio.CancelledError from None
            raise
        return [chunks[index] for index in _ranked_indexes(payload["results"], size=len(chunks))]


def _ranked_indexes(results: list[dict], *, size: int) -> list[int]:
    scores: dict[int, float] = {}
    for item in results:
        index, score = item["index"], item["relevance_score"]
        if (
            type(index) is not int
            or not 0 <= index < size
            or index in scores
            or type(score) not in (int, float)
            or not math.isfinite(score)
            or not 0 <= score <= 1
        ):
            raise ValueError("Invalid provider reranking result")
        scores[index] = score
    if len(scores) != size:
        raise ValueError("Incomplete provider reranking result")
    return sorted(scores, key=lambda index: (-scores[index], index))
