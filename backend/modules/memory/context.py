from __future__ import annotations

from dataclasses import replace
from typing import Protocol

from backend.modules.memory.consolidation import MemoryConsolidator
from backend.modules.memory.domain import MemoryItem, MemorySearchRequest
from backend.modules.memory.enums import MemoryLevel
from backend.modules.memory.metrics import retrieved_memory_count
from backend.modules.memory.provider import MEMORY_CONTEXT_HEADER
from backend.modules.memory.ranking import memory_recency_weight

RETRIEVAL_ORDER: tuple[MemoryLevel, ...] = (
    MemoryLevel.USER,
    MemoryLevel.PROJECT,
    MemoryLevel.SESSION,
    MemoryLevel.AGENT,
    MemoryLevel.EPISODIC,
)

LEVEL_WEIGHTS: dict[MemoryLevel, float] = {
    MemoryLevel.USER: 1.0,
    MemoryLevel.PROJECT: 0.95,
    MemoryLevel.SESSION: 0.85,
    MemoryLevel.AGENT: 0.75,
    MemoryLevel.EPISODIC: 0.65,
}


class MemoryContextBuilder:
    def __init__(
        self,
        memory_service: MemoryServiceProtocol,
        consolidator: MemoryConsolidator | None = None,
    ):
        self.memory_service = memory_service
        self.consolidator = consolidator or MemoryConsolidator()

    async def build_context_block(self, request: MemorySearchRequest) -> str:
        items = await self.recall_ranked(request)
        return self.format_context_block(items)

    def format_context_block(self, items: list[MemoryItem]) -> str:
        retrieved_memory_count.inc(len(items))
        if not items:
            return ""

        lines: list[str] = [MEMORY_CONTEXT_HEADER]
        for index, item in enumerate(items, start=1):
            citation = f"[memory:{item.id}]"
            level = item.metadata.memory_level.value
            lines.append(f"{index}. {citation} ({level}) {item.content}")
        return "\n".join(lines)

    async def recall_ranked(self, request: MemorySearchRequest) -> list[MemoryItem]:
        levels = request.memory_levels or list(RETRIEVAL_ORDER)
        ordered_levels = [level for level in RETRIEVAL_ORDER if level in levels]
        if not ordered_levels:
            return []

        search_request = replace(request, memory_levels=ordered_levels)
        collected = await self.memory_service.recall(
            search_request,
        )

        deduped = self.consolidator.mark_contradictions(collected)
        deduped.sort(key=self._rank_score, reverse=True)
        return deduped[: request.limit]

    def _rank_score(self, item: MemoryItem) -> float:
        level_weight = LEVEL_WEIGHTS.get(item.metadata.memory_level, 0.5)
        relevance = item.score or 0.5
        confidence = item.metadata.confidence or 0.5
        seen = item.metadata.last_seen_at or item.metadata.created_at
        recency = memory_recency_weight(seen)
        return (level_weight * 0.4) + (relevance * 0.35) + (confidence * 0.15) + (recency * 0.1)


class MemoryServiceProtocol(Protocol):
    async def recall(
        self,
        request: MemorySearchRequest,
    ) -> list[MemoryItem]: ...
