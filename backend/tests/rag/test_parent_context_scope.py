from types import SimpleNamespace
from unittest.mock import AsyncMock, call

import pytest
from backend.modules.rag.parent_context_service import expand_parent_chunks
from backend.modules.rag.domain import RetrievedChunk


@pytest.mark.asyncio
async def test_parent_expansion_uses_the_callers_document_scope() -> None:
    repo = AsyncMock()
    child = SimpleNamespace(
        id="child-1",
        document_id="doc-1",
        parent_chunk_id="parent-1",
    )
    parent = SimpleNamespace(
        id="parent-1",
        document_id="doc-1",
        content="authorized parent context",
        chunk_index=-1,
    )
    repo.get_chunks_by_ids_for_scope.side_effect = [[child], [parent]]
    chunks = [
        RetrievedChunk(
            chunk_id="child-1",
            document_id="doc-1",
            content="authorized child",
            score=0.9,
            filename="doc.txt",
            chunk_index=0,
        )
    ]

    result = await expand_parent_chunks(
        chunks,
        repo=repo,
        user_id="user-1",
        project_id="project-1",
        document_ids=["doc-1"],
    )

    assert result[0].context_content == "authorized parent context"
    assert repo.get_chunks_by_ids_for_scope.await_args_list == [
        call(
            ["child-1"],
            user_id="user-1",
            project_id="project-1",
            document_ids=["doc-1"],
        ),
        call(
            ["parent-1"],
            user_id="user-1",
            project_id="project-1",
            document_ids=["doc-1"],
        ),
    ]


@pytest.mark.asyncio
async def test_parent_expansion_rejects_another_revision_of_same_document() -> None:
    repo = AsyncMock()
    repo.get_chunks_by_ids_for_scope.side_effect = [
        [
            SimpleNamespace(
                id="child", document_id="doc", revision_id="r2", parent_chunk_id="parent"
            )
        ],
        [
            SimpleNamespace(
                id="parent", document_id="doc", revision_id="r1", content="old", chunk_index=-1
            )
        ],
    ]
    chunk = RetrievedChunk(
        chunk_id="child", document_id="doc", content="new", score=1, filename="", chunk_index=0
    )
    assert await expand_parent_chunks(
        [chunk], repo=repo, user_id="user", project_id=None, document_ids=["doc"]
    ) == [chunk]
