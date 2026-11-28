from types import SimpleNamespace

import pytest
from backend.modules.rag.application.document_ingestion_service import DocumentIngestionService
from fastapi import HTTPException


@pytest.mark.asyncio
async def test_indexing_stops_when_rag_is_disabled() -> None:
    service = object.__new__(DocumentIngestionService)
    service.config = SimpleNamespace(enabled=False)

    with pytest.raises(HTTPException) as error:
        await service.index_document(
            document_id="doc-1",
            user_id="user-1",
        )

    assert error.value.status_code == 503
