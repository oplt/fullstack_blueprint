from types import SimpleNamespace

import pytest
from backend.modules.rag.application.chunking_service import _split_documents_with_token_counts
from backend.modules.rag.application.document_ingestion_service import (
    DocumentIngestionService,
    _validate_parsed_document_limits,
)
from backend.modules.rag.domain.models import DocumentChunk, ParsedDocument


def test_parsed_document_limits_reject_page_character_and_unit_overages() -> None:
    config = SimpleNamespace(
        max_document_pages=2,
        max_document_characters=5,
        max_ingestion_chunks=2,
    )
    page_config = SimpleNamespace(
        max_document_pages=2,
        max_document_characters=5,
        max_ingestion_chunks=5,
    )

    with pytest.raises(ValueError, match="page limit"):
        _validate_parsed_document_limits(
            [
                ParsedDocument("a", page_number=1),
                ParsedDocument("b", page_number=2),
                ParsedDocument("c", page_number=3),
            ],
            page_config,
        )
    with pytest.raises(ValueError, match="character limit"):
        _validate_parsed_document_limits([ParsedDocument("123456")], config)
    with pytest.raises(ValueError, match="parsed-unit limit"):
        _validate_parsed_document_limits(
            [ParsedDocument("a"), ParsedDocument("b"), ParsedDocument("c")],
            config,
        )


def test_chunking_stops_at_chunk_and_token_limits() -> None:
    config = SimpleNamespace(chunk_policy_version="test", chunk_size=2, chunk_overlap=0)
    document = ParsedDocument("one two three four five", metadata={"format": "text"})

    with pytest.raises(ValueError, match="chunk limit"):
        _split_documents_with_token_counts(
            [document],
            config=config,
            max_chunks=1,
            max_tokens=100,
        )
    with pytest.raises(ValueError, match="token limit"):
        _split_documents_with_token_counts(
            [document],
            config=config,
            max_chunks=10,
            max_tokens=1,
        )


def test_pdf_page_and_text_limits_are_checked_during_parse(monkeypatch) -> None:
    from backend.core.config import settings
    from backend.modules.rag.infrastructure.pdf_parsers import (
        _validate_pdf_character_count,
        _validate_pdf_page_count,
    )

    monkeypatch.setattr(settings, "RAG_MAX_DOCUMENT_PAGES", 2)
    monkeypatch.setattr(settings, "RAG_MAX_DOCUMENT_CHARACTERS", 5)

    with pytest.raises(ValueError, match="page limit"):
        _validate_pdf_page_count(3)
    with pytest.raises(ValueError, match="character limit"):
        _validate_pdf_character_count(6)


def test_ingestion_embeddings_are_processed_in_bounded_batches(monkeypatch) -> None:
    import asyncio

    from backend.core.config import settings

    class Embeddings:
        def __init__(self) -> None:
            self.calls: list[list[str]] = []

        async def embed_texts(self, texts: list[str]) -> list[list[float]]:
            self.calls.append(texts)
            return [[1.0, 2.0] for _ in texts]

    async def run() -> None:
        service = object.__new__(DocumentIngestionService)
        service.config = SimpleNamespace(embedding_dimensions=2)
        service.embeddings = Embeddings()

        async def without_heartbeat(operation, **_kwargs):
            return await operation

        service._with_heartbeat = without_heartbeat
        chunks = [
            DocumentChunk(
                document_id="doc-1",
                user_id="user-1",
                chunk_index=index,
                content=f"chunk {index}",
                token_count=2,
            )
            for index in range(5)
        ]
        monkeypatch.setattr(settings, "RAG_EMBEDDING_BATCH_SIZE", 2)

        await service._embed_retrieval_chunks(chunks, attempt_args={})

        assert service.embeddings.calls == [
            ["chunk 0", "chunk 1"],
            ["chunk 2", "chunk 3"],
            ["chunk 4"],
        ]
        assert all(chunk.embedding == [1.0, 2.0] for chunk in chunks)

    asyncio.run(run())
