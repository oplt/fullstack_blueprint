import asyncio

import pytest
from backend.core.config import settings
from backend.lib import embedding_cache


def test_provider_batch_concurrency_is_shared_across_calls(monkeypatch) -> None:
    monkeypatch.setattr(embedding_cache, "_batch_size", lambda: 1)
    monkeypatch.setattr(embedding_cache, "_batch_concurrency", lambda: 1)

    async def run_batches(texts: list[str], embed_fn) -> list[list[float]]:
        return await embedding_cache._embed_batches(
            texts,
            embed_fn,
            provider="test-provider-global-limit",
        )

    async def run() -> None:
        active_calls = 0
        max_active_calls = 0

        async def embed_fn(texts: list[str]) -> list[list[float]]:
            nonlocal active_calls, max_active_calls
            active_calls += 1
            max_active_calls = max(max_active_calls, active_calls)
            await asyncio.sleep(0.005)
            active_calls -= 1
            return [[1.0] for _ in texts]

        await asyncio.gather(
            run_batches(["a", "b"], embed_fn),
            run_batches(["c", "d"], embed_fn),
        )

        assert max_active_calls == 1

    asyncio.run(run())


def test_cancelled_single_flight_owner_releases_waiters(monkeypatch) -> None:
    monkeypatch.setattr(settings, "CACHE_ENABLED", True)
    monkeypatch.setattr(settings, "CACHE_EMBEDDING_MAX_TEXT_CHARS", 1000)
    monkeypatch.setattr(settings, "CACHE_EMBEDDING_TTL_SECONDS", 60)
    monkeypatch.setattr(embedding_cache, "cache_mget_json", _empty_cache)
    embedding_cache.reset_embedding_flight_locks_for_tests()

    async def run() -> None:
        provider_started = asyncio.Event()

        async def blocked_embed(_texts: list[str]) -> list[list[float]]:
            provider_started.set()
            await asyncio.Future()

        async def embed() -> list[list[float]]:
            return await embedding_cache.embed_texts_with_cache(
                provider="test-provider-cancellation",
                model="test-model",
                texts=["unique cancellation query"],
                embed_fn=blocked_embed,
            )

        owner = asyncio.create_task(embed())
        await provider_started.wait()
        waiter = asyncio.create_task(embed())
        await asyncio.sleep(0)

        owner.cancel()
        with pytest.raises(asyncio.CancelledError):
            await owner
        with pytest.raises(asyncio.CancelledError):
            await asyncio.wait_for(waiter, timeout=1)

        assert not embedding_cache._INFLIGHT

    asyncio.run(run())


def test_failed_provider_batch_cancels_sibling_batches(monkeypatch) -> None:
    monkeypatch.setattr(embedding_cache, "_batch_size", lambda: 1)
    monkeypatch.setattr(embedding_cache, "_batch_concurrency", lambda: 2)

    async def run() -> None:
        both_started = asyncio.Event()
        sibling_cancelled = asyncio.Event()
        active_calls = 0

        async def embed_fn(texts: list[str]) -> list[list[float]]:
            nonlocal active_calls
            active_calls += 1
            if active_calls == 2:
                both_started.set()
            try:
                await both_started.wait()
                if texts[0] == "fail":
                    raise ValueError("provider batch failed")
                await asyncio.Future()
            except asyncio.CancelledError:
                sibling_cancelled.set()
                raise

        with pytest.raises(ValueError, match="provider batch failed"):
            await embedding_cache._embed_batches(
                ["fail", "wait"],
                embed_fn,
                provider="test-provider-batch-cancel",
            )

        assert sibling_cancelled.is_set()

    asyncio.run(run())


async def _empty_cache(_keys: list[str]) -> list[None]:
    return [None]
