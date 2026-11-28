"""Provider-neutral, privacy-minimized product analytics."""

from __future__ import annotations

import hashlib
import re
from collections.abc import Awaitable, Callable
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import settings
from backend.modules.capabilities.models import AnalyticsEvent

_SENSITIVE_KEY = re.compile(r"(password|secret|token|key|prompt|content|body)", re.I)
AnalyticsSink = Callable[[str, dict[str, Any]], Awaitable[None]]


def sanitize_properties(properties: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value
        for key, value in properties.items()
        if not _SENSITIVE_KEY.search(key) and isinstance(value, (str, int, float, bool, type(None)))
    }


class AnalyticsService:
    def __init__(self, db: AsyncSession, sink: AnalyticsSink | None = None) -> None:
        self.db = db
        self.sink = sink

    async def track(
        self,
        *,
        event_name: str,
        tenant_id: str | None,
        user_id: str | None,
        properties: dict[str, Any] | None = None,
        dedupe_key: str | None = None,
        organization_id: str | None = None,
    ) -> AnalyticsEvent | None:
        if not settings.ANALYTICS_ENABLED:
            return None
        safe = sanitize_properties(properties or {})
        row = AnalyticsEvent(
            event_name=event_name,
            tenant_id=tenant_id,
            user_id=user_id,
            organization_id=organization_id,
            properties_json=safe,
            dedupe_key=dedupe_key,
        )
        self.db.add(row)
        await self.db.flush()
        if self.sink:
            await self.sink(event_name, safe)
        return row

    @staticmethod
    def stable_anonymous_id(user_id: str, *, salt: str) -> str:
        return hashlib.sha256(f"{salt}:{user_id}".encode()).hexdigest()[:24]
