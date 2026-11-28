import pytest

from backend.modules.memory.jobs import _claim_turn_extraction


class _FakeRedis:
    def __init__(self, *, complete: bool = False, claimed: bool = True) -> None:
        self.complete = complete
        self.claimed = claimed
        self.calls: list[tuple] = []

    async def get(self, key: str):
        self.calls.append(("get", key))
        return "1" if self.complete else None

    async def set(self, key: str, value: str, *, ex: int, nx: bool):
        self.calls.append(("set", key, value, ex, nx))
        return self.claimed


@pytest.mark.asyncio
async def test_turn_extraction_claim_uses_a_lease_for_duplicate_jobs() -> None:
    redis = _FakeRedis()

    claimed, lease_key = await _claim_turn_extraction(redis, "memory:complete:source-1")

    assert claimed is True
    assert lease_key == "memory:complete:source-1:lease"
    assert redis.calls[1][3] == 15 * 60
    assert redis.calls[1][4] is True


@pytest.mark.asyncio
async def test_completed_or_concurrent_turn_extraction_is_skipped() -> None:
    complete = _FakeRedis(complete=True)
    duplicate = _FakeRedis(claimed=False)

    assert await _claim_turn_extraction(complete, "memory:complete:source-1") == (False, None)
    assert await _claim_turn_extraction(duplicate, "memory:complete:source-1") == (False, None)
