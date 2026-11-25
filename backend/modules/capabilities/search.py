"""Provider-neutral application search contract."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any, Protocol


@dataclass(frozen=True, slots=True)
class SearchResult:
    resource_type: str
    resource_id: str
    title: str
    snippet: str
    score: float
    tenant_id: str


class SearchPort(Protocol):
    async def search(self, query: str, *, tenant_id: str, limit: int) -> list[SearchResult]: ...


class SearchService:
    def __init__(self, provider: SearchPort) -> None:
        self.provider = provider

    async def search(self, query: str, *, tenant_id: str, limit: int = 20) -> list[SearchResult]:
        if not query.strip():
            return []
        rows = await self.provider.search(
            query.strip(), tenant_id=tenant_id, limit=max(1, min(limit, 100))
        )
        return [row for row in rows if row.tenant_id == tenant_id]


class CallableSearchProvider:
    def __init__(self, callback: Callable[..., Awaitable[list[dict[str, Any]]]]) -> None:
        self.callback = callback

    async def search(self, query: str, *, tenant_id: str, limit: int) -> list[SearchResult]:
        rows = await self.callback(query, tenant_id=tenant_id, limit=limit)
        return [SearchResult(**row) for row in rows]
