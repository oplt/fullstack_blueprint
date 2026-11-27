from __future__ import annotations

import pytest
from backend.modules.profile.router import _read_avatar_payload
from fastapi import HTTPException


class _Upload:
    def __init__(self, payload: bytes) -> None:
        self.payload = payload
        self.read_sizes: list[int] = []

    async def read(self, size: int) -> bytes:
        self.read_sizes.append(size)
        return self.payload[:size]


@pytest.mark.asyncio
async def test_avatar_payload_rejects_svg_content_type_without_reading() -> None:
    upload = _Upload(b"<svg></svg>")

    with pytest.raises(HTTPException) as error:
        await _read_avatar_payload(upload, "image/svg+xml", max_bytes=1024)

    assert error.value.status_code == 400
    assert upload.read_sizes == []


@pytest.mark.asyncio
async def test_avatar_payload_reads_at_most_configured_size_plus_one() -> None:
    upload = _Upload(b"\x89PNG\r\n\x1a\n" + b"x" * 2048)

    with pytest.raises(HTTPException) as error:
        await _read_avatar_payload(upload, "image/png", max_bytes=1024)

    assert error.value.status_code == 413
    assert upload.read_sizes == [1025]


@pytest.mark.asyncio
async def test_avatar_payload_checks_bytes_match_declared_raster_type() -> None:
    upload = _Upload(b"not actually an image")

    with pytest.raises(HTTPException) as error:
        await _read_avatar_payload(upload, "image/png", max_bytes=1024)

    assert error.value.status_code == 400
