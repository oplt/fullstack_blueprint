from __future__ import annotations

import asyncio
import hashlib
import logging

from backend.modules.rag.domain.models import ParsedDocument
from backend.modules.rag.infrastructure.docling_parser import DoclingParserAdapter
from backend.modules.rag.infrastructure.langchain_document_loaders import parse_documents_from_bytes
from backend.modules.rag.infrastructure.parser_provenance import normalize_parsed_documents
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
        return await asyncio.to_thread(
            self.parse,
            content=content,
            filename=filename,
            content_type=content_type,
            metadata=metadata,
        )

    def parse(
        self,
        *,
        content: bytes,
        filename: str,
        content_type: str,
        metadata: dict | None = None,
    ) -> list[ParsedDocument]:
        if self.config and self.config.docling_enabled and self.config.pdf_parser == "docling":
            try:
                docs = self.docling.parse(
                    content=content,
                    filename=filename,
                    content_type=content_type,
                )
            except Exception as exc:
                logger.info(
                    "Docling parsing failed; using baseline parser (%s)", type(exc).__name__
                )
                docs = parse_documents_from_bytes(
                    content=content,
                    filename=filename,
                    content_type=content_type,
                )
                for document in docs:
                    document.metadata.update(
                        {
                            "configured_parser": "docling",
                            "fallback_used": True,
                            "fallback_reason": type(exc).__name__,
                        }
                    )
        else:
            docs = parse_documents_from_bytes(
                content=content,
                filename=filename,
                content_type=content_type,
            )
        if metadata:
            for doc in docs:
                doc.metadata.update(metadata)
        trusted_metadata = metadata or {}
        return normalize_parsed_documents(
            docs,
            source_document_hash=hashlib.sha256(content).hexdigest(),
            document_id=(
                str(trusted_metadata["document_id"])
                if trusted_metadata.get("document_id") is not None
                else None
            ),
            revision_id=(
                str(trusted_metadata["document_revision_id"])
                if trusted_metadata.get("document_revision_id") is not None
                else None
            ),
        )
