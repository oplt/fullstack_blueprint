"""Resource-bounded document validation and optional malware scanning ports."""

from __future__ import annotations

import asyncio
import io
import zipfile
from dataclasses import dataclass
from enum import StrEnum
from typing import Protocol

from backend.modules.rag.config import RagConfig


class MalwareScanStatus(StrEnum):
    CLEAN = "clean"
    INFECTED = "infected"
    ERROR = "error"
    UNAVAILABLE = "unavailable"
    NOT_CONFIGURED = "not_configured"


@dataclass(frozen=True, slots=True)
class MalwareScanResult:
    status: MalwareScanStatus
    signature: str | None = None


class MalwareDetectedError(ValueError):
    """The scanner detected malware."""


class MalwareScanUnavailableError(RuntimeError):
    """Document safety could not be verified."""

    def __init__(self, status: MalwareScanStatus) -> None:
        self.status = status
        super().__init__("Document safety could not be verified")


class MalwareScannerPort(Protocol):
    async def scan(self, content: bytes, *, filename: str) -> MalwareScanResult: ...


def normalize_clamd_response(response: object) -> MalwareScanResult:
    if not isinstance(response, dict):
        return MalwareScanResult(MalwareScanStatus.ERROR)

    entry = response.get("stream")
    if not isinstance(entry, tuple) or len(entry) != 2:
        return MalwareScanResult(MalwareScanStatus.ERROR)

    status, signature = entry
    if status == "OK" and signature in (None, ""):
        return MalwareScanResult(MalwareScanStatus.CLEAN)
    if status == "FOUND" and isinstance(signature, str) and signature:
        return MalwareScanResult(MalwareScanStatus.INFECTED, signature)

    return MalwareScanResult(MalwareScanStatus.ERROR)


class NoopMalwareScanner:
    async def scan(self, content: bytes, *, filename: str) -> MalwareScanResult:
        return MalwareScanResult(MalwareScanStatus.NOT_CONFIGURED)


class ClamdMalwareScanner:
    """Optional local clamd adapter."""

    async def scan(self, content: bytes, *, filename: str) -> MalwareScanResult:
        def _scan() -> MalwareScanResult:
            try:
                import clamd  # type: ignore[reportMissingImports]
            except ImportError:
                return MalwareScanResult(MalwareScanStatus.UNAVAILABLE)

            try:
                client = clamd.ClamdUnixSocket(timeout=30)
                response = client.instream(io.BytesIO(content))
            except OSError:
                return MalwareScanResult(MalwareScanStatus.UNAVAILABLE)
            except Exception:
                # External scanner/protocol failures must never imply a clean scan.
                return MalwareScanResult(MalwareScanStatus.ERROR)

            return normalize_clamd_response(response)

        return await asyncio.to_thread(_scan)


class DocumentSafetyService:
    def __init__(self, config: RagConfig, scanner: MalwareScannerPort | None = None) -> None:
        self.config = config
        if config.malware_scan_required and not config.malware_scan_enabled:
            raise ValueError("Required malware scanning cannot be disabled")
        if config.malware_scan_enabled and config.malware_scanner != "clamd":
            raise ValueError("Enabled malware scanning requires a configured scanner")

        self.scanner = (
            scanner
            if scanner is not None
            else (ClamdMalwareScanner() if config.malware_scan_enabled else NoopMalwareScanner())
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
        result = await self.scanner.scan(content, filename=filename)
        if not isinstance(result, MalwareScanResult) or not isinstance(
            result.status, MalwareScanStatus
        ):
            raise MalwareScanUnavailableError(MalwareScanStatus.ERROR)

        if result.status == MalwareScanStatus.INFECTED:
            raise MalwareDetectedError("Malware detected in document")

        explicitly_disabled = (
            not self.config.malware_scan_enabled
            and not self.config.malware_scan_required
            and result.status == MalwareScanStatus.NOT_CONFIGURED
        )
        if result.status != MalwareScanStatus.CLEAN and not explicitly_disabled:
            raise MalwareScanUnavailableError(result.status)

        self.validate_container(content, filename=filename)
        return result
