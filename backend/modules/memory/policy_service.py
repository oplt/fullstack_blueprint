"""Backward-compatible import for the canonical memory policy service."""

from __future__ import annotations

from backend.modules.memory.policies import MemoryPolicyService

__all__ = ["MemoryPolicyService"]
