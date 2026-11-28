import io
import zipfile
from types import SimpleNamespace

import pytest

from backend.modules.rag.safety import (
    DocumentSafetyService,
    MalwareDetectedError,
    MalwareScanResult,
    MalwareScanStatus,
    MalwareScanUnavailableError,
)


def test_validate_container_rejects_malformed_office_archive() -> None:
    with pytest.raises(ValueError, match="invalid document archive"):
        DocumentSafetyService.validate_container(
            b"not a zip archive",
            filename="report.docx",
        )


def test_validate_container_rejects_windows_absolute_member_paths() -> None:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("C:/outside.txt", "unsafe")

    with pytest.raises(ValueError, match="unsafe path"):
        DocumentSafetyService.validate_container(buffer.getvalue(), filename="report.docx")


class _FixedScanner:
    def __init__(self, result: MalwareScanResult) -> None:
        self.result = result

    async def scan(
        self,
        _content: bytes,
        *,
        filename: str,  # noqa: ARG002
    ) -> MalwareScanResult:
        return self.result


def _config(*, enabled: bool, required: bool = False) -> SimpleNamespace:
    return SimpleNamespace(
        malware_scan_enabled=enabled,
        malware_scan_required=required,
        malware_scanner="clamd" if enabled else "none",
    )


@pytest.mark.asyncio
async def test_scan_fails_closed_when_required_scanner_is_unavailable() -> None:
    service = DocumentSafetyService(
        _config(enabled=True, required=True),
        _FixedScanner(MalwareScanResult(MalwareScanStatus.UNAVAILABLE)),
    )

    with pytest.raises(MalwareScanUnavailableError) as error:
        await service.scan(b"content", filename="report.txt")

    assert error.value.status == MalwareScanStatus.UNAVAILABLE


@pytest.mark.asyncio
async def test_scan_rejects_infected_content() -> None:
    service = DocumentSafetyService(
        _config(enabled=True),
        _FixedScanner(MalwareScanResult(MalwareScanStatus.INFECTED, "test-signature")),
    )

    with pytest.raises(MalwareDetectedError):
        await service.scan(b"content", filename="report.txt")
