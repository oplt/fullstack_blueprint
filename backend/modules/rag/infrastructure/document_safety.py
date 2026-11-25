"""Resource-bounded document validation and optional malware scanning ports."""

from __future__ import annotations

import asyncio
import io
import zipfile
from dataclasses import dataclass
from typing import Protocol

from backend.modules.rag.infrastructure.rag_config import RagConfig


@dataclass(frozen=True, slots=True)
class MalwareScanResult:
    status: str
    signature: str | None = None


class MalwareScannerPort(Protocol):
    async def scan(self, content: bytes, *, filename: str) -> MalwareScanResult: ...


class NoopMalwareScanner:
    async def scan(self, content: bytes, *, filename: str) -> MalwareScanResult:
        return MalwareScanResult(status="not_configured")


class ClamdMalwareScanner:
    """Optional clamd adapter; no shell commands or network destinations are accepted."""

    async def scan(self, content: bytes, *, filename: str) -> MalwareScanResult:
        try:
            import clamd  # type: ignore[reportMissingImports]
        except ImportError as exc:  # pragma: no cover - optional integration
            raise RuntimeError("clamd is required for the clamd malware scanner") from exc

        def _scan() -> MalwareScanResult:
            client = clamd.ClamdUnixSocket()
            result = client.instream(io.BytesIO(content))
            status = str(result.get("stream", ("UNKNOWN", ""))[0]).lower()
            signature = str(result.get("stream", ("", ""))[1] or "") or None
            return MalwareScanResult(
                status="infected" if status == "found" else "clean",
                signature=signature,
            )

        return await asyncio.to_thread(_scan)


class DocumentSafetyService:
    def __init__(self, config: RagConfig, scanner: MalwareScannerPort | None = None) -> None:
        self.config = config
        self.scanner = scanner or (
            ClamdMalwareScanner()
            if config.malware_scan_enabled and config.malware_scanner == "clamd"
            else NoopMalwareScanner()
        )

    @staticmethod
    def validate_container(content: bytes, *, filename: str, max_members: int = 10_000) -> None:
        """Reject archive path traversal and decompression-bomb metadata."""
        if filename.lower().endswith((".docx", ".xlsx", ".pptx", ".odt")):
            with zipfile.ZipFile(io.BytesIO(content)) as archive:
                members = archive.infolist()
                if len(members) > max_members:
                    raise ValueError("document archive contains too many members")
                total_uncompressed = sum(member.file_size for member in members)
                if total_uncompressed > 100 * 1024 * 1024:
                    raise ValueError("document archive expands beyond the resource limit")
                for member in members:
                    name = member.filename.replace("\\", "/")
                    if name.startswith("/") or "../" in name or name == "..":
                        raise ValueError("document archive contains an unsafe path")

    async def scan(self, content: bytes, *, filename: str) -> MalwareScanResult:
        self.validate_container(content, filename=filename)
        result = await self.scanner.scan(content, filename=filename)
        if result.status == "infected":
            raise ValueError("malware detected in document")
        if self.config.malware_scan_required and result.status == "not_configured":
            raise RuntimeError("required malware scanner is not configured")
        return result
