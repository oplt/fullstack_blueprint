from __future__ import annotations

import logging

from backend.modules.rag.domain.models import ParsedDocument
from backend.modules.rag.infrastructure.docling_parser import DoclingParserAdapter
from backend.modules.rag.infrastructure.langchain_document_loaders import load_documents_from_bytes
from backend.modules.rag.infrastructure.rag_config import RagConfig

logger = logging.getLogger(__name__)


class DocumentParserService:
    def __init__(self, config: RagConfig | None = None) -> None:
        self.config = config
        self.docling = DoclingParserAdapter()

    async def parse_bytes(
        self,
        *,
        content: bytes,
        filename: str,
        content_type: str,
        metadata: dict | None = None,
    ) -> list[ParsedDocument]:
        if self.config and self.config.docling_enabled and self.config.pdf_parser == "docling":
            docs = await self.docling.parse_bytes(
                content=content,
                filename=filename,
                content_type=content_type,
            )
        else:
            docs = await load_documents_from_bytes(
                content=content,
                filename=filename,
                content_type=content_type,
            )
        if metadata:
            for doc in docs:
                doc.metadata.update(metadata)
        return docs
