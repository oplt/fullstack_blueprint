"""Editable memory governance, provenance and retention primitives."""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

from backend.modules.memory.domain import MemoryLevel
from backend.modules.memory.policies import contains_secret

_SENSITIVE_PATTERNS = (
    re.compile(r"(?i)\b(password|passwd|pwd)\s*[:=]\s*\S+"),
    re.compile(r"(?i)\b(api[_-]?key|secret|token|bearer)\s*[:=]\s*\S+"),
    re.compile(r"\b(?:\d[ -]*?){13,19}\b"),
)


@dataclass(frozen=True, slots=True)
class MemoryGovernanceDecision:
    allowed: bool
    content: str
    content_hash: str
    expires_at: datetime | None
    reason: str | None = None


def canonical_memory_content(content: str) -> str:
    return " ".join(content.strip().split())


def memory_content_hash(content: str) -> str:
    return hashlib.sha256(canonical_memory_content(content).casefold().encode()).hexdigest()


def filter_sensitive_information(content: str) -> str:
    filtered = content
    for pattern in _SENSITIVE_PATTERNS:
        filtered = pattern.sub("[REDACTED]", filtered)
    return filtered


def evaluate_memory_governance(
    *,
    content: str,
    level: MemoryLevel,
    confidence: float,
    consent_status: str,
    retention_days: int | None,
    sensitive_filter_enabled: bool = True,
    now: datetime | None = None,
) -> MemoryGovernanceDecision:
    normalized = canonical_memory_content(content)
    if not normalized:
        return MemoryGovernanceDecision(False, "", memory_content_hash(""), None, "empty")
    if consent_status == "withdrawn":
        return MemoryGovernanceDecision(
            False, normalized, memory_content_hash(normalized), None, "consent_withdrawn"
        )
    if sensitive_filter_enabled and contains_secret(normalized):
        return MemoryGovernanceDecision(
            False,
            filter_sensitive_information(normalized),
            memory_content_hash(normalized),
            None,
            "sensitive_information",
        )
    if not 0 <= confidence <= 1:
        return MemoryGovernanceDecision(
            False, normalized, memory_content_hash(normalized), None, "invalid_confidence"
        )
    effective_days = retention_days
    if level == MemoryLevel.SESSION and effective_days is None:
        effective_days = 30
    expires_at = None
    if effective_days is not None:
        expires_at = (now or datetime.now(UTC)) + timedelta(days=max(1, effective_days))
    return MemoryGovernanceDecision(
        True,
        normalized,
        memory_content_hash(normalized),
        expires_at,
    )


def provenance_payload(
    *,
    source: str,
    source_ref: str | None,
    run_id: str | None,
    consent_status: str,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "source": source,
        "source_ref": source_ref,
        "run_id": run_id,
        "consent_status": consent_status,
        **(extra or {}),
    }
