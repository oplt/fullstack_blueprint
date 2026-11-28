from backend.modules.rag.retrieval import (
    RetrievalBranchResult,
    _coerce_branch_result,
    _embed_query_variants,
    _limited_branch,
)


def test_branch_result_normalizes_unexpected_exceptions() -> None:
    result = _coerce_branch_result(ValueError("query failed"))

    assert result == RetrievalBranchResult(chunks=[], succeeded=False, error="ValueError")


def test_branch_result_preserves_success_values() -> None:
    result = RetrievalBranchResult(chunks=[], succeeded=True, error=None)
    coerced = _coerce_branch_result(result)

    assert coerced is result


def test_branch_result_preserves_cancellation() -> None:
    import asyncio

    cancellation = asyncio.CancelledError()

    try:
        _coerce_branch_result(cancellation)
    except asyncio.CancelledError as error:
        assert error is cancellation
    else:
        raise AssertionError("Branch cancellation was swallowed")


def test_unique_query_variants_are_embedded_in_one_batch() -> None:
    import asyncio

    class Embeddings:
        def __init__(self) -> None:
            self.calls: list[list[str]] = []

        async def embed_texts(self, texts: list[str]) -> list[list[float]]:
            self.calls.append(texts)
            return [[float(index)] for index, _ in enumerate(texts)]

    embeddings = Embeddings()
    vectors = asyncio.run(_embed_query_variants(embeddings, ["q1", "q2", "q1"]))

    assert embeddings.calls == [["q1", "q2"]]
    assert vectors == {"q1": [0.0], "q2": [1.0]}


def test_noop_branch_does_not_take_branch_semaphore() -> None:
    import asyncio

    class CountingSemaphore:
        entered = 0

        async def __aenter__(self):
            self.entered += 1

        async def __aexit__(self, *_args):
            return None

    async def branch():
        return "done"

    semaphore = CountingSemaphore()
    result = asyncio.run(_limited_branch(branch(), semaphore, enabled=False))

    assert result == "done"
    assert semaphore.entered == 0

    result = asyncio.run(_limited_branch(branch(), semaphore, enabled=True))

    assert result == "done"
    assert semaphore.entered == 1


def test_database_branch_uses_a_fresh_session_for_engine_bound_requests(monkeypatch) -> None:
    import asyncio
    from types import SimpleNamespace
    from unittest.mock import MagicMock

    from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

    from backend.modules.rag import retrieval as retrieval_module
    from backend.modules.rag.retrieval import RetrievalService

    async def run() -> None:
        engine = MagicMock(spec=AsyncEngine)
        request_session = AsyncSession(bind=engine)
        config = SimpleNamespace(rerank_enabled=False, rerank_heuristic_enabled=False)
        monkeypatch.setattr(retrieval_module, "build_vector_store", lambda *_args: object())
        monkeypatch.setattr(retrieval_module, "EmbeddingService", lambda _config: object())
        monkeypatch.setattr(retrieval_module, "build_reranker", lambda **_kwargs: object())
        monkeypatch.setattr(retrieval_module, "RagRepository", lambda _db: object())
        monkeypatch.setattr(retrieval_module, "RagSearchRepository", lambda _db: object())
        monkeypatch.setattr(retrieval_module, "QueryExpansionService", lambda: object())
        service = RetrievalService(request_session, config=config)

        async with service._database_branch() as branch_session:
            assert branch_session is not request_session
            assert branch_session.bind is engine

        await request_session.close()

    asyncio.run(run())


def test_retrieval_deadline_cancels_in_flight_work(monkeypatch) -> None:
    import asyncio

    import pytest

    from backend.core.config import settings
    from backend.modules.rag.retrieval import RetrievalService

    async def run() -> None:
        service = RetrievalService.__new__(RetrievalService)
        cancelled = asyncio.Event()

        async def blocked_retrieval(_request):
            try:
                await asyncio.Future()
            finally:
                cancelled.set()

        service._retrieve = blocked_retrieval
        monkeypatch.setattr(settings, "RAG_RETRIEVAL_TIMEOUT_SECONDS", 0.01)
        with pytest.raises(TimeoutError):
            await service.retrieve(object())

        assert cancelled.is_set()

    asyncio.run(run())
