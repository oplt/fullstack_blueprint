"""Local deterministic provider."""

from __future__ import annotations

import hashlib
import json
import math
from collections.abc import AsyncIterator

from backend.core.config import settings
from backend.core.vectors import estimate_tokens
from backend.modules.ai.contracts import (
    AiCapability,
    AiProviderRequest,
    AiProviderResponse,
    AiRunCompletedEvent,
    AiRunStartedEvent,
    AiStreamEvent,
    AiTextDeltaEvent,
    AiUsage,
)
from backend.modules.ai.providers.common import BaseAiProvider


def _hash_embedding(text: str, dimensions: int = 32) -> list[float]:
    values: list[float] = []
    for index in range(dimensions):
        digest = hashlib.sha256(f"{index}:{text}".encode()).digest()
        integer = int.from_bytes(digest[:8], "big")
        values.append(((integer % 2000) / 1000.0) - 1.0)
    norm = math.sqrt(sum(value * value for value in values)) or 1.0
    return [value / norm for value in values]


class LocalHeuristicProvider(BaseAiProvider):
    key = "local"
    capabilities = frozenset(
        {
            AiCapability.TEXT,
            AiCapability.STRUCTURED_OUTPUT,
            AiCapability.STREAMING,
            AiCapability.EMBEDDINGS,
        }
    )

    async def generate_contract(self, request: AiProviderRequest) -> AiProviderResponse:
        prompt = request.user_prompt.strip()
        system = request.system_prompt.strip()
        if request.response_format == "json":
            output_json = {
                "claims": [],
                "no_evidence": True,
                "insufficient_evidence_reason": (
                    "Local heuristic provider cannot synthesize grounded claims."
                ),
            }
            output_text = json.dumps(output_json, indent=2)
        else:
            output_json = None
            output_text = (
                f"[{request.model}] Heuristic response\n\n"
                f"System context:\n{system[:400] or 'None'}\n\n"
                f"User prompt:\n{prompt[:1500]}"
            )
        return AiProviderResponse(
            provider_key=self.key,
            model=request.model,
            output_text=output_text,
            output_json=output_json,
            usage=AiUsage(
                input_tokens=estimate_tokens(f"{system}\n{prompt}"),
                output_tokens=estimate_tokens(output_text),
            ),
            provider_request_id=request.provider_request_id,
        )

    async def embed_texts(self, texts: list[str], model: str | None = None) -> list[list[float]]:
        return [
            _hash_embedding(text, dimensions=settings.RAG_EMBEDDING_DIMENSIONS) for text in texts
        ]

    async def stream_contract(self, request: AiProviderRequest) -> AsyncIterator[AiStreamEvent]:
        response = await self.generate_contract(request)
        run_id = request.metadata.get("run_id", request.provider_request_id)
        yield AiRunStartedEvent(
            run_id=run_id, sequence=0, provider_key=self.key, model=request.model
        )
        sequence = 1
        for part in (
            response.output_text[index : index + 96]
            for index in range(0, len(response.output_text), 96)
        ):
            yield AiTextDeltaEvent(run_id=run_id, sequence=sequence, delta=part)
            sequence += 1
        yield AiRunCompletedEvent(run_id=run_id, sequence=sequence, response=response)
