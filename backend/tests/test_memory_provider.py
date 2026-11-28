"""Contract tests for the degraded Mem0 adapter."""

from __future__ import annotations

import pytest

from backend.modules.memory.provider import (
    MemoryProviderUnavailableError,
    NullMem0Adapter,
)


@pytest.mark.asyncio
async def test_null_adapter_add_and_delete_fail_loudly() -> None:
    adapter = NullMem0Adapter("memory disabled or Mem0 not configured")

    with pytest.raises(MemoryProviderUnavailableError):
        await adapter.add(content="x", filters={}, metadata={})

    with pytest.raises(MemoryProviderUnavailableError):
        await adapter.delete("memory-id")


@pytest.mark.asyncio
async def test_null_adapter_reads_degrade_to_empty() -> None:
    adapter = NullMem0Adapter("memory disabled or Mem0 not configured")

    assert await adapter.search(query="x", filters={}, top_k=5) == []
    assert await adapter.get_all(filters={}, top_k=5) == []
    assert await adapter.get("memory-id") is None
