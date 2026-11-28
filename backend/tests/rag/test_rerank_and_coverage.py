import asyncio
from dataclasses import replace
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from backend.modules.rag.cohere_reranker import CohereReranker
from backend.modules.rag.context_selection import select_context_chunks
from backend.modules.rag.domain import RetrievedChunk
from backend.modules.rag.enums import RetrievalIntent
from backend.modules.rag.rerank_policy import apply_rerank_policy
from backend.modules.rag.retrieval_planner import plan_retrieval
from backend.modules.rag.source_diversifier import diversify_by_document


def _chunk(chunk_id: str, *, document: str = "doc", score: float = 0.5) -> RetrievedChunk:
    return RetrievedChunk(chunk_id, document, chunk_id, score, "source.pdf", 0)


@pytest.mark.asyncio
async def test_provider_reranks_authorized_children_and_keeps_fusion_scores(monkeypatch) -> None:
    ranker = CohereReranker(api_key="fixture-key", model="fixture-model")
    post = AsyncMock(
        return_value={
            "results": [{"index": 0, "relevance_score": 0.1}, {"index": 1, "relevance_score": 0.9}]
        }
    )
    monkeypatch.setattr(ranker, "_post_json", post)
    first = replace(_chunk("first", score=0.04), context_content="parent content")
    second = _chunk("second", score=0.03)
    tail = _chunk("tail")
    result = await apply_rerank_policy(ranker, "question", [first, second, tail], depth=2)
    assert result.chunks == [second, first, tail]
    assert result.attempted and not result.failed
    payload = post.await_args.args[2]
    assert payload["documents"] == ["first", "second"]
    assert payload["top_n"] == 2


@pytest.mark.asyncio
async def test_rerank_deadline_keeps_baseline_and_propagates_external_cancellation() -> None:
    async def block(*_args, **_kwargs):
        await asyncio.Future()

    ranker = SimpleNamespace(rank=block)
    baseline = [_chunk("first"), _chunk("second")]
    result = await apply_rerank_policy(ranker, "question", baseline, depth=2, timeout_seconds=0.01)
    assert result.chunks == baseline and result.failed and result.fallback_reason == "TimeoutError"
    task = asyncio.create_task(apply_rerank_policy(ranker, "question", baseline, depth=2))
    await asyncio.sleep(0)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task


def test_distinct_table_row_groups_survive_generation_evidence_deduplication() -> None:
    metadata = {"table_block_id": "table", "source_span_ids": ["table-span"], "sheet_id": "main"}
    first = replace(
        _chunk("first", score=0.04),
        rank=2,
        metadata={**metadata, "table_row_start": 1, "table_row_end": 2},
    )
    second = replace(
        _chunk("second", score=0.02),
        rank=1,
        metadata={**metadata, "table_row_start": 2, "table_row_end": 3},
    )
    duplicate = replace(first, chunk_id="duplicate", rank=3)
    result = select_context_chunks([first, second, duplicate])
    assert result.chunks[0].chunk_id == "second"
    assert result.selected_chunk_ids == ["second", "first"]
    assert result.removed_chunk_ids == ["duplicate"]


def test_comparison_coverage_fills_first_pass_from_distinct_sources() -> None:
    result, coverage = diversify_by_document(
        [_chunk("first"), _chunk("duplicate-source"), _chunk("alternative", document="other")],
        limit=2,
        max_per_document=3,
        documents_in_scope=2,
        prefer_coverage=True,
    )
    assert [chunk.chunk_id for chunk in result] == ["first", "alternative"]
    assert coverage.documents_with_retrieved_evidence == 2


def test_provider_pool_is_bounded_and_explicit_top_k_is_honored() -> None:
    config = SimpleNamespace(rerank_mode="provider", rerank_max_depth=1000)
    profile = plan_retrieval(RetrievalIntent.EVIDENCE, config, top_k=3)
    assert profile.rerank_depth == 256
    assert profile.top_k == 3
    assert profile.rerank_method == "cohere"
