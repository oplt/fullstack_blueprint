from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from backend.core.config import settings
from core.db.vector_search import (
    InvalidQueryEmbedding,
    VectorSearchUnavailable,
    invalidate_pgvector_capability,
    pgvector_is_available,
    rank_embedding_matches,
)
from core.vectors import can_index_embedding, is_valid_embedding
from backend.modules.rag.domain.retrieval_scope import RetrievalScope
from backend.modules.rag.infrastructure.search_repository import RagSearchRepository
from sqlalchemy.exc import OperationalError
from sqlalchemy.exc import TimeoutError as SQLAlchemyTimeoutError
from sqlalchemy.pool import StaticPool


class _Engine:
    dialect = SimpleNamespace(name="postgresql")

    def __init__(self) -> None:
        self.pool = StaticPool(creator=lambda: object())


def _result(*, available: bool = True, rows: list | None = None) -> Mock:
    result = Mock()
    result.scalar.return_value = 1 if available else None
    result.mappings.return_value.all.return_value = rows or []
    return result


def _query_embedding() -> list[float]:
    return [0.1] * settings.RAG_EMBEDDING_DIMENSIONS


@pytest.mark.asyncio
async def test_capability_probe_caches_per_engine_and_can_be_invalidated() -> None:
    engine = _Engine()
    first = AsyncMock()
    first.bind = engine
    first.execute.return_value = _result()
    second = AsyncMock()
    second.bind = engine
    second.execute.return_value = _result(available=False)

    invalidate_pgvector_capability(engine)
    assert await pgvector_is_available(first) is True
    assert await pgvector_is_available(second) is True
    second.execute.assert_not_awaited()

    engine.pool.dispatch.invalidate(None, None, None)
    assert await pgvector_is_available(second) is False
    second.execute.assert_awaited_once()

    invalidate_pgvector_capability(engine)
    first.execute.reset_mock()
    first.execute.return_value = _result(available=False)
    assert await pgvector_is_available(first) is False
    first.execute.assert_awaited_once()
    invalidate_pgvector_capability(engine)


@pytest.mark.asyncio
async def test_capability_probe_database_failure_is_not_unsupported_vector() -> None:
    db = AsyncMock()
    db.bind = None
    db.execute.side_effect = OperationalError("probe", {}, RuntimeError("connection lost"))

    with pytest.raises(VectorSearchUnavailable, match="pgvector_capability_check_failed"):
        await pgvector_is_available(db)


@pytest.mark.asyncio
async def test_indexed_database_failure_is_not_reported_as_capability_miss() -> None:
    db = AsyncMock()
    db.bind = None
    db.execute.side_effect = [
        _result(),
        OperationalError("search", {}, RuntimeError("query failed")),
    ]
    repository = RagSearchRepository(db)

    with pytest.raises(VectorSearchUnavailable, match="indexed_search_failed"):
        await repository.similarity_search_indexed(
            scope=RetrievalScope(
                user_id="u1", project_id=None, document_ids=None, owner_scoped=True
            ),
            query_embedding=_query_embedding(),
            top_k=5,
            score_threshold=0.1,
        )


@pytest.mark.asyncio
async def test_lexical_timeout_is_a_failed_branch_and_zero_rows_are_empty() -> None:
    scope = RetrievalScope(user_id="u1", project_id=None, document_ids=None, owner_scoped=True)
    timed_out = AsyncMock()
    timed_out.bind = None
    timed_out.execute.side_effect = SQLAlchemyTimeoutError("statement timed out")
    repository = RagSearchRepository(timed_out)

    with pytest.raises(VectorSearchUnavailable, match="lexical_search_failed"):
        await repository.lexical_search(scope=scope, query="needle", top_k=5)

    empty = AsyncMock()
    empty.bind = None
    empty.execute.return_value = _result(rows=[])
    assert (
        await RagSearchRepository(empty).lexical_search(scope=scope, query="needle", top_k=5) == []
    )


@pytest.mark.asyncio
async def test_unsupported_vector_and_zero_indexed_results_remain_distinct() -> None:
    scope = RetrievalScope(user_id="u1", project_id=None, document_ids=None, owner_scoped=True)
    unsupported = AsyncMock()
    unsupported.bind = None
    unsupported.execute.return_value = _result(available=False)
    assert (
        await RagSearchRepository(unsupported).similarity_search_indexed(
            scope=scope,
            query_embedding=_query_embedding(),
            top_k=5,
            score_threshold=0.1,
        )
        is None
    )

    no_matches = AsyncMock()
    no_matches.bind = None
    no_matches.execute.side_effect = [_result(), _result(rows=[])]
    assert (
        await RagSearchRepository(no_matches).similarity_search_indexed(
            scope=scope,
            query_embedding=_query_embedding(),
            top_k=5,
            score_threshold=0.1,
        )
        == []
    )


def test_embedding_validation_rejects_nonfinite_boolean_and_wrong_dimension() -> None:
    assert is_valid_embedding([0.25, -0.5])
    assert not is_valid_embedding([float("nan")])
    assert not is_valid_embedding([float("inf")])
    assert not is_valid_embedding([True])
    assert not can_index_embedding([0.1])

    with pytest.raises(InvalidQueryEmbedding):
        rank_embedding_matches(
            [float("nan")],
            [],
            top_k=5,
            score_threshold=0.1,
            build_match=lambda row, _score: row,
        )


@pytest.mark.asyncio
async def test_json_fallback_is_bounded_and_refuses_oversized_scope() -> None:
    db = AsyncMock()
    db.bind = None
    result = _result(rows=[{}, {}])
    db.execute.return_value = result

    from core.db.vector_search import DenseFallbackScopeTooLarge

    with pytest.raises(DenseFallbackScopeTooLarge):
        await RagSearchRepository(db).similarity_search_json_fallback(
            scope=RetrievalScope(
                user_id="u1", project_id=None, document_ids=None, owner_scoped=True
            ),
            query_embedding=_query_embedding(),
            top_k=5,
            score_threshold=0.1,
            exact_max_rows=1,
        )
    statement = db.execute.await_args.args[0]
    assert "LIMIT" in str(statement.compile().string).upper()


@pytest.mark.asyncio
async def test_json_fallback_hard_caps_configured_scan_limit() -> None:
    db = AsyncMock()
    db.bind = None
    db.execute.return_value = _result(rows=[])

    await RagSearchRepository(db).similarity_search_json_fallback(
        scope=RetrievalScope(user_id="u1", project_id=None, document_ids=None, owner_scoped=True),
        query_embedding=_query_embedding(),
        top_k=5,
        score_threshold=0.1,
        exact_max_rows=50_000,
    )

    statement = db.execute.await_args.args[0]
    assert statement._limit_clause.value == 5001


@pytest.mark.asyncio
async def test_vector_adapter_disables_json_fallback_in_production(monkeypatch) -> None:
    from core.db.vector_search import VectorSearchUnavailable
    from backend.modules.rag.infrastructure.pgvector_adapter import PgVectorAdapter

    db = AsyncMock()
    config = SimpleNamespace(score_threshold=0.3, exact_vector_fallback_max_rows=5000)
    adapter = PgVectorAdapter(db, config=config)
    adapter.search_repo.similarity_search_indexed = AsyncMock(return_value=None)
    adapter.search_repo.similarity_search_json_fallback = AsyncMock(return_value=[])
    monkeypatch.setattr(settings, "APP_ENV", "production")

    with pytest.raises(VectorSearchUnavailable, match="pgvector_required_for_production"):
        await adapter.similarity_search(
            "needle",
            user_id="u1",
            project_id=None,
            top_k=5,
            query_embedding=_query_embedding(),
        )

    adapter.search_repo.similarity_search_json_fallback.assert_not_awaited()

    no_matches = PgVectorAdapter(db, config=config)
    no_matches.search_repo.similarity_search_indexed = AsyncMock(side_effect=[[], []])
    no_matches.search_repo.similarity_search_json_fallback = AsyncMock(return_value=[])
    assert (
        await no_matches.similarity_search(
            "needle",
            user_id="u1",
            project_id=None,
            top_k=5,
            query_embedding=_query_embedding(),
        )
        == []
    )
    no_matches.search_repo.similarity_search_json_fallback.assert_not_awaited()
