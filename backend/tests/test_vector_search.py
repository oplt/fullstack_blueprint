from unittest.mock import AsyncMock, Mock

import pytest
from sqlalchemy import Update

from backend.core.db.vector_search import store_chunk_embeddings_batch
from backend.modules.rag.models import RagChunk


@pytest.mark.asyncio
async def test_embedding_updates_use_a_bound_sqlalchemy_update() -> None:
    db = AsyncMock()
    db.bind = None
    extension_result = Mock()
    extension_result.scalar.return_value = 1
    db.execute.side_effect = [extension_result, Mock()]

    await store_chunk_embeddings_batch(
        db,
        table=RagChunk.__table__,
        items=[("chunk-id", [0.1] * 1536)],
    )

    update = db.execute.await_args_list[1].args[0]
    assert isinstance(update, Update)
    assert "rag_chunks" in str(update)


@pytest.mark.asyncio
async def test_embedding_updates_use_one_executemany_call() -> None:
    db = AsyncMock()
    db.bind = None
    extension_result = Mock()
    extension_result.scalar.return_value = 1
    db.execute.side_effect = [extension_result, Mock()]

    await store_chunk_embeddings_batch(
        db,
        table=RagChunk.__table__,
        items=[("chunk-a", [0.1] * 1536), ("chunk-b", [0.2] * 1536)],
    )

    assert db.execute.await_count == 2
    assert isinstance(db.execute.await_args_list[1].args[0], Update)
    parameters = db.execute.await_args_list[1].args[1]
    assert [item["chunk_id"] for item in parameters] == ["chunk-a", "chunk-b"]
