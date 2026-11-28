import unittest
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from backend.modules.ai.document_service import AiDocumentService
from backend.modules.rag.domain import RetrievalOutcome, RetrievedChunk
from backend.modules.rag.domain import DocumentStatus
from backend.modules.rag.service import (
    AiDocumentView,
    RagDocumentService,
    rag_document_to_ai_view,
)


class RagDocumentMappingTest(unittest.TestCase):
    def test_maps_indexed_status_to_completed(self):
        document = SimpleNamespace(
            id="doc-1",
            original_filename="notes.txt",
            content_type="text/plain",
            status=DocumentStatus.INDEXED.value,
            metadata_json='{"title":"Notes","size_bytes":12,"chunk_count":3}',
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        view = rag_document_to_ai_view(document)
        self.assertEqual(view.ingestion_status, "completed")
        self.assertEqual(view.chunk_count, 3)
        self.assertEqual(view.title, "Notes")


class AiDocumentServiceDelegationTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.db = AsyncMock()
        self.user = SimpleNamespace(id="user-1")

    @patch("backend.modules.ai.document_service.settings")
    async def test_list_documents_delegates_when_rag_enabled(
        self, mock_settings
    ):
        mock_settings.RAG_ENABLED = True
        documents_port = AsyncMock()
        documents_port.list_documents = AsyncMock(
            return_value=(
                [
                    AiDocumentView(
                        id="doc-1",
                        title="Doc",
                        description=None,
                        filename="doc.txt",
                        content_type="text/plain",
                        size_bytes=10,
                        ingestion_status="pending",
                        metadata_json={},
                        chunk_count=0,
                        created_at=datetime.now(UTC),
                        updated_at=datetime.now(UTC),
                    )
                ],
                1,
            )
        )
        service = AiDocumentService(self.db, retrieval_factory=lambda db: SimpleNamespace(documents=documents_port))

        documents, _ = await service.list_documents(self.user)
        self.assertEqual(documents[0].id, "doc-1")
        documents_port.list_documents.assert_awaited_once_with(
            "user-1", limit=50, offset=0
        )

    @patch("backend.modules.ai.document_service.settings")
    async def test_retrieve_chunks_delegates_when_rag_enabled(
        self, mock_settings
    ):
        mock_settings.RAG_ENABLED = True
        documents_port = AsyncMock()
        documents_port.retrieve_chunks = AsyncMock(
            return_value=[
                {
                    "document_id": "doc-1",
                    "chunk_id": "chunk-1",
                    "document_title": "Doc",
                    "chunk_index": 0,
                    "score": 0.9,
                    "content": "hello",
                }
            ]
        )
        service = AiDocumentService(self.db, retrieval_factory=lambda db: SimpleNamespace(documents=documents_port))

        matches = await service.retrieve_chunks(
            self.user,
            query="hello",
            document_ids=["doc-1"],
            top_k=3,
        )
        self.assertEqual(matches[0]["chunk_id"], "chunk-1")
        documents_port.retrieve_chunks.assert_awaited_once()


class RagDocumentServiceRetrieveTest(unittest.IsolatedAsyncioTestCase):
    async def test_empty_document_allowlist_returns_no_chunks(self):
        db = AsyncMock()
        service = RagDocumentService(db)
        service.retrieval.retrieve = AsyncMock()

        matches = await service.retrieve_chunks(
            user_id="user-1",
            query="hello",
            document_ids=[],
            top_k=5,
        )

        self.assertEqual(matches, [])
        service.retrieval.retrieve.assert_not_awaited()

    async def test_retrieve_maps_rag_chunks(self):
        db = AsyncMock()
        service = RagDocumentService(db)
        service.repo.filter_document_ids_for_user = AsyncMock(return_value=["doc-1"])
        service.repo.get_documents_by_ids = AsyncMock(
            return_value=[
                SimpleNamespace(
                    id="doc-1",
                    user_id="user-1",
                    original_filename="Doc",
                )
            ]
        )
        service.retrieval.retrieve = AsyncMock(
            return_value=RetrievalOutcome(
                chunks=[
                    RetrievedChunk(
                        chunk_id="chunk-1",
                        document_id="doc-1",
                        content="hello",
                        score=0.95,
                        filename="Doc",
                        chunk_index=0,
                    )
                ]
            )
        )

        matches = await service.retrieve_chunks(
            user_id="user-1",
            query="hello",
            document_ids=["doc-1"],
            top_k=5,
        )
        self.assertEqual(matches[0]["chunk_id"], "chunk-1")
        self.assertEqual(matches[0]["document_title"], "Doc")
        service.repo.get_documents_by_ids.assert_awaited_once_with(["doc-1"], user_id="user-1")
