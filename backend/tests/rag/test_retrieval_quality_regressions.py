from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from backend.modules.rag.domain import ParsedDocument, RetrievedChunk
from backend.modules.rag.domain import RetrievalIntent
from backend.modules.rag.parsing import DocumentParserService
from backend.modules.rag.query import analyze_query, quoted_phrase
from backend.modules.rag.query import QueryExpansionService
from backend.modules.rag.ranking import apply_rerank_policy
from backend.modules.rag.ranking import reciprocal_rank_fusion
from backend.modules.rag.retrieval_planner import plan_retrieval
from backend.modules.rag.vector_store import PgVectorAdapter


def _chunk(chunk_id: str, score: float = 0.0) -> RetrievedChunk:
    return RetrievedChunk(
        chunk_id=chunk_id,
        document_id=f"doc-{chunk_id}",
        content=chunk_id,
        score=score,
        filename=f"{chunk_id}.txt",
        chunk_index=0,
    )


def test_rrf_counts_a_chunk_once_per_ranked_list() -> None:
    ranked = reciprocal_rank_fusion(
        [[_chunk("repeated"), _chunk("repeated"), _chunk("other")]],
        k=1,
        limit=2,
    )

    assert [chunk.chunk_id for chunk in ranked] == ["repeated", "other"]
    assert ranked[0].score == round(1 / 2, 6)
    assert ranked[1].score == round(1 / 3, 6)


def test_dutch_contradiction_queries_use_dutch_variants() -> None:
    variants = QueryExpansionService().expand_contradiction(
        "Welk bewijs tegenspreekt de conclusie?"
    )

    assert {variant.language for variant in variants} == {"nl"}
    assert "Bewijs dat tegenspreekt" in variants[2].dense_text
    assert variants[2].lexical_text == "Welk bewijs tegenspreekt de conclusie?"
    assert analyze_query(variants[0].text).intent == RetrievalIntent.CONTRADICTION


def test_english_entity_containing_turkish_characters_does_not_force_turkish() -> None:
    variants = QueryExpansionService().expand_contradiction(
        "What evidence contradicts the agreement signed by Çağlayan?"
    )
    assert variants[0].language == "en"


def test_quoted_phrase_survives_contractions_in_lexical_query() -> None:
    assert quoted_phrase("What's covered by 'force majeure'?") == "force majeure"


@pytest.mark.asyncio
async def test_reranker_cannot_replace_scoped_candidate_content() -> None:
    baseline = [_chunk("one", 0.04), _chunk("two", 0.03)]
    ranker = SimpleNamespace(rank=AsyncMock(return_value=[_chunk("foreign")]))
    result = await apply_rerank_policy(ranker, "test", baseline, depth=2)
    assert result.failed
    assert result.chunks == baseline


@pytest.mark.asyncio
async def test_dense_search_never_relaxes_minimum_cosine_score(monkeypatch) -> None:
    monkeypatch.setattr("backend.modules.rag.vector_store.settings.APP_ENV", "production")
    adapter = PgVectorAdapter(AsyncMock(), SimpleNamespace(score_threshold=0.4))
    indexed = AsyncMock(side_effect=[[], [_chunk("low-score", 0.25)]])
    adapter.search_repo.similarity_search_indexed = indexed
    assert (
        await adapter.similarity_search(
            "test", user_id="user", project_id=None, top_k=5, query_embedding=[1.0]
        )
        == []
    )
    assert indexed.await_count == 1


def test_reranking_flag_without_implementation_is_reported_as_noop() -> None:
    config = SimpleNamespace(
        top_k=5,
        evidence_top_k=12,
        dense_candidates=40,
        lexical_candidates=40,
        source_max_chunks_per_document=3,
        rerank_enabled=True,
        rerank_heuristic_enabled=False,
        rerank_max_depth=40,
    )

    plan = plan_retrieval(RetrievalIntent.EVIDENCE, config)

    assert plan.rerank_method == "noop"
    assert plan.rerank_depth == 0

    config.rerank_enabled = False
    config.rerank_heuristic_enabled = True
    plan = plan_retrieval(RetrievalIntent.EVIDENCE, config)

    assert plan.rerank_method == "noop"
    assert plan.rerank_depth == 0


def test_docling_failure_falls_back_with_parser_provenance(monkeypatch) -> None:
    def fail_parse(**_kwargs):
        raise ValueError("conversion failed")

    def baseline_parse(**_kwargs):
        return [ParsedDocument(content="baseline text")]

    service = DocumentParserService(SimpleNamespace(docling_enabled=True, pdf_parser="docling"))
    service.docling.parse = fail_parse
    monkeypatch.setattr(
        "backend.modules.rag.parsing.parse_documents_from_bytes",
        baseline_parse,
    )

    documents = service.parse(
        content=b"file",
        filename="sample.pdf",
        content_type="application/pdf",
    )

    assert documents[0].metadata["fallback_used"] is True
    assert documents[0].metadata["configured_parser"] == "docling"
    assert documents[0].metadata["fallback_reason"] == "ValueError"
