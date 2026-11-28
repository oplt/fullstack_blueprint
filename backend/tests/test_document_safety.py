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
    normalize_clamd_response,
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


def test_validate_container_rejects_parent_traversal_and_relative_escape() -> None:
    for member in ("../outside.txt", "..\\outside.txt", ".."):
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w") as archive:
            archive.writestr(member, "unsafe")

        with pytest.raises(ValueError, match="unsafe path"):
            DocumentSafetyService.validate_container(buffer.getvalue(), filename="report.docx")


def test_validate_container_rejects_too_many_members() -> None:
    many = io.BytesIO()
    with zipfile.ZipFile(many, "w") as archive:
        for index in range(3):
            archive.writestr(f"member-{index}.xml", "<ok/>")

    with pytest.raises(ValueError, match="too many members"):
        DocumentSafetyService.validate_container(
            many.getvalue(), filename="report.docx", max_members=2
        )


def test_validate_container_accepts_safe_archive_and_ignores_non_containers() -> None:
    safe = io.BytesIO()
    with zipfile.ZipFile(safe, "w") as archive:
        archive.writestr("word/document.xml", "<w:document />")

    DocumentSafetyService.validate_container(safe.getvalue(), filename="report.docx")
    DocumentSafetyService.validate_container(b"plain text", filename="notes.txt")


def test_normalize_clamd_response_maps_clean_infected_and_malformed() -> None:
    assert normalize_clamd_response({"stream": ("OK", None)}) == MalwareScanResult(
        MalwareScanStatus.CLEAN
    )
    assert normalize_clamd_response({"stream": ("OK", "")}) == MalwareScanResult(
        MalwareScanStatus.CLEAN
    )
    assert normalize_clamd_response(
        {"stream": ("FOUND", "Eicar-Test-Signature")}
    ) == MalwareScanResult(MalwareScanStatus.INFECTED, "Eicar-Test-Signature")
    assert normalize_clamd_response({"stream": ("FOUND", None)}).status == MalwareScanStatus.ERROR
    assert (
        normalize_clamd_response({"stream": ("OK", "unexpected")}).status == MalwareScanStatus.ERROR
    )
    assert normalize_clamd_response("not a dict").status == MalwareScanStatus.ERROR


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


@pytest.mark.asyncio
async def test_scan_fails_closed_on_error_and_misconfigured_not_configured() -> None:
    for status in (MalwareScanStatus.ERROR, MalwareScanStatus.NOT_CONFIGURED):
        service = DocumentSafetyService(
            _config(enabled=True, required=True),
            _FixedScanner(MalwareScanResult(status)),
        )
        with pytest.raises(MalwareScanUnavailableError) as error:
            await service.scan(b"content", filename="report.txt")
        assert error.value.status == status


@pytest.mark.asyncio
async def test_scan_allows_not_configured_only_when_scanning_is_explicitly_disabled() -> None:
    service = DocumentSafetyService(
        _config(enabled=False, required=False),
        _FixedScanner(MalwareScanResult(MalwareScanStatus.NOT_CONFIGURED)),
    )

    result = await service.scan(b"content", filename="report.txt")

    assert result.status == MalwareScanStatus.NOT_CONFIGURED


@pytest.mark.asyncio
async def test_scan_still_validates_container_after_a_clean_scan() -> None:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("../escape.txt", "unsafe")

    service = DocumentSafetyService(
        _config(enabled=True),
        _FixedScanner(MalwareScanResult(MalwareScanStatus.CLEAN)),
    )

    with pytest.raises(ValueError, match="unsafe path"):
        await service.scan(buffer.getvalue(), filename="report.docx")


def test_service_rejects_invalid_malware_configuration() -> None:
    with pytest.raises(ValueError, match="cannot be disabled"):
        DocumentSafetyService(_config(enabled=False, required=True))

    with pytest.raises(ValueError, match="configured scanner"):
        DocumentSafetyService(
            SimpleNamespace(
                malware_scan_enabled=True,
                malware_scan_required=False,
                malware_scanner="none",
            )
        )
