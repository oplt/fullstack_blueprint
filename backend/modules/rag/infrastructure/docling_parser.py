"""Optional Docling parser adapter with a safe baseline fallback boundary."""

from __future__ import annotations

import asyncio
import tempfile
from pathlib import Path

from backend.modules.rag.domain.models import ParsedDocument


class DoclingParserAdapter:
    name = "docling-v1"

    async def parse_bytes(
        self, *, content: bytes, filename: str, content_type: str
    ) -> list[ParsedDocument]:
        return await asyncio.to_thread(
            self._parse_sync,
            content=content,
            filename=filename,
            content_type=content_type,
        )

    def _parse_sync(
        self, *, content: bytes, filename: str, content_type: str
    ) -> list[ParsedDocument]:
        try:
            from docling.document_converter import (  # type: ignore[reportMissingImports]
                DocumentConverter,
            )
        except ImportError as exc:  # pragma: no cover - optional integration
            raise RuntimeError("Docling is not installed; use the rag-advanced extra") from exc

        suffix = Path(filename).suffix or ".bin"
        with tempfile.NamedTemporaryFile(suffix=suffix) as temporary:
            temporary.write(content)
            temporary.flush()
            result = DocumentConverter().convert(temporary.name)
            markdown = result.document.export_to_markdown().strip()
        if not markdown:
            return []
        return [
            ParsedDocument(
                content=markdown,
                metadata={
                    "format": suffix.lstrip(".") or content_type,
                    "parser": self.name,
                    "parser_trust": "untrusted_document_data",
                    "layout_aware": True,
                    "tables_preserved": True,
                },
            )
        ]
