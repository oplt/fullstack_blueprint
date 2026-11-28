from unittest.mock import AsyncMock, Mock

import pytest
from pydantic import ValidationError
from sqlalchemy import ColumnElement, select
from sqlalchemy.dialects import postgresql

from backend.modules.rag.filters import RetrievalMetadataFilter
from backend.modules.rag.models import RagChunk
from backend.modules.rag.repository import RagRepository
from backend.modules.rag.scope import RetrievalScope
from backend.modules.rag.search_repository import RagSearchRepository


def test_retrieval_scope_filters_bind_untrusted_filter_values() -> None:
    malicious_value = "' OR 1=1 --"
    filters = RagSearchRepository(AsyncMock())._retrieval_scope_filters(
        RetrievalScope(
            user_id=malicious_value,
            project_id=malicious_value,
            document_ids=(malicious_value,),
            owner_scoped=True,
        )
    )

    assert filters is not None
    assert all(isinstance(condition, ColumnElement) for condition in filters)
    statement = select(RagChunk.id).where(*filters)
    compiled = statement.compile(dialect=postgresql.dialect())
    assert malicious_value not in str(compiled)
    assert malicious_value in compiled.params.values()


@pytest.mark.asyncio
async def test_parent_chunk_lookup_is_scoped_to_user_project_and_documents() -> None:
    db = AsyncMock()
    result = Mock()
    result.scalars.return_value.all.return_value = []
    db.execute.return_value = result
    await RagRepository(db).get_chunks_by_ids_for_scope(
        ["chunk-1"],
        user_id="user-1",
        project_id="project-1",
        document_ids=["doc-1"],
    )

    statement = db.execute.await_args.args[0]
    compiled = statement.compile(dialect=postgresql.dialect())

    assert "project_members" in str(compiled)
    params = list(compiled.params.values())
    assert all(value in params for value in ("user-1", "project-1", ["doc-1"]))
    assert "deleted_at IS NULL" in str(compiled)


@pytest.mark.asyncio
async def test_search_language_metadata_references_joined_tables() -> None:
    db = AsyncMock()
    result = Mock()
    result.mappings.return_value.all.return_value = []
    db.execute.return_value = result
    await RagSearchRepository(db).lexical_search(
        scope=RetrievalScope(user_id="user", project_id=None, document_ids=None),
        query="arbeidsovereenkomst",
        top_k=5,
    )
    stmt = db.execute.await_args.args[0]
    compiled = stmt.compile(dialect=postgresql.dialect())
    assert "rag_chunks.metadata_json" in str(compiled)
    assert "rag_documents.metadata_json" in str(compiled)
    assert "dutch" in compiled.params.values()


def test_metadata_constraints_are_typed_and_bound_inside_retrieval_scope() -> None:
    metadata = RetrievalMetadataFilter(formats=("pdf",), languages=("nl",), page_from=2, page_to=3)
    conditions = RagSearchRepository(AsyncMock())._retrieval_scope_filters(
        RetrievalScope(
            user_id="owner", project_id="project", document_ids=("document",), metadata=metadata
        )
    )
    assert conditions is not None
    compiled = select(RagChunk.id).where(*conditions).compile(dialect=postgresql.dialect())
    assert all(
        value in compiled.params.values()
        for value in (["pdf"], ["nl"], 2, 3, "owner", "project", ["document"])
    )
    assert (
        RagSearchRepository(AsyncMock())._retrieval_scope_filters(
            RetrievalScope(user_id="owner", project_id=None, document_ids=(), metadata=metadata)
        )
        is None
    )


@pytest.mark.parametrize(
    "payload",
    [
        {"languages": ["nl OR true"]},
        {"formats": []},
        {"page_from": 3, "page_to": 2},
        {"page_from": True},
        {"operator": "raw"},
    ],
)
def test_metadata_constraints_reject_invalid_values(payload) -> None:
    with pytest.raises(ValidationError):
        RetrievalMetadataFilter.model_validate(payload)
