from dataclasses import replace
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from backend.modules.rag.api import routes
from backend.modules.rag.api.schemas import RagCompareRequest, RagRetrievalDraft
from backend.modules.rag.domain.models import RetrievalOutcome
from backend.modules.rag.infrastructure.rag_config import RagConfig
from pydantic import ValidationError


def test_draft_models_allow_only_bounded_request_local_settings() -> None:
    for payload in (
        {"candidate_pool": 257},
        {"min_cosine": 1.1},
        {"rrf_k": 0},
        {"reranker": "provider"},
        {"api_key": "not-a-setting"},
    ):
        with pytest.raises(ValidationError):
            RagRetrievalDraft.model_validate(payload)


@pytest.mark.asyncio
async def test_comparison_reuses_authorized_revisions_and_keeps_draft_request_local(
    monkeypatch,
) -> None:
    initial = replace(RagConfig.from_settings(), enabled=True, score_threshold=0.3)
    scope = AsyncMock(return_value=[("doc", "revision-1")])
    monkeypatch.setattr(
        routes,
        "RagRepository",
        lambda _db: SimpleNamespace(list_preview_revisions=scope),
    )
    monkeypatch.setattr(routes, "_require_rag_enabled", lambda: None)
    monkeypatch.setattr(routes.RagConfig, "from_settings", lambda: initial)
    seen = []

    def service(_db, config):
        async def retrieve(request):
            seen.append((config, request))
            return RetrievalOutcome(chunks=[], no_matches=True)

        return SimpleNamespace(retrieve=retrieve)

    monkeypatch.setattr(routes, "RetrievalService", service)
    response = await routes.compare_retrieval(
        RagCompareRequest(
            query="Find the limit",
            project_id="project",
            document_ids=["doc"],
            draft=RagRetrievalDraft(
                min_cosine=0.7,
                candidate_pool=12,
                rrf_k=30,
                reranker="heuristic",
            ),
        ),
        request=SimpleNamespace(is_disconnected=AsyncMock(return_value=False)),
        db=None,
        current_user=SimpleNamespace(id="user"),
    )
    assert initial.score_threshold == 0.3
    assert [config.score_threshold for config, _ in seen] == [0.3, 0.7]
    assert seen[1][0].dense_candidates == 12
    assert seen[1][0].rerank_mode == "heuristic"
    assert all(request.filters["index_revision_ids"] == ["revision-1"] for _, request in seen)
    assert all(request.filters["owner_scoped"] and request.preview for _, request in seen)
    assert all(not request.persist_trace for _, request in seen)
    assert response.index_revision_ids == ["revision-1"]
    assert scope.await_count == 2
    scope.assert_awaited_with(user_id="user", project_id="project", document_ids=["doc"])


@pytest.mark.asyncio
async def test_unscoped_comparison_rejects_revision_changes_during_run(monkeypatch) -> None:
    initial = replace(RagConfig.from_settings(), enabled=True)
    scope = AsyncMock(side_effect=[[("doc", "revision-1")], [("doc", "revision-2")]])
    monkeypatch.setattr(
        routes,
        "RagRepository",
        lambda _db: SimpleNamespace(list_preview_revisions=scope),
    )
    monkeypatch.setattr(routes, "_require_rag_enabled", lambda: None)
    monkeypatch.setattr(routes.RagConfig, "from_settings", lambda: initial)

    def service(_db, _config):
        async def retrieve(_request):
            return RetrievalOutcome(chunks=[], no_matches=True)

        return SimpleNamespace(retrieve=retrieve)

    monkeypatch.setattr(routes, "RetrievalService", service)
    with pytest.raises(routes.HTTPException) as error:
        await routes.compare_retrieval(
            RagCompareRequest(query="Find the limit", draft=RagRetrievalDraft()),
            request=SimpleNamespace(is_disconnected=AsyncMock(return_value=False)),
            db=None,
            current_user=SimpleNamespace(id="user"),
        )

    assert error.value.status_code == 409
