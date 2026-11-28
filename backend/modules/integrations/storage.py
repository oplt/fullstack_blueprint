"""Provider-neutral storage service with ownership, quota and lifecycle checks."""

from __future__ import annotations

import hashlib
import hmac
import os
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Protocol
from urllib.parse import quote

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import settings
from backend.core.storage import object_storage
from backend.modules.capabilities.models import StorageObject


class StorageProviderPort(Protocol):
    async def put(self, key: str, body: bytes, content_type: str) -> None: ...

    async def signed_upload(self, key: str, content_type: str, expires_in: int) -> str: ...

    async def delete(self, key: str) -> None: ...

    async def signed_download(self, key: str, expires_in: int) -> str: ...


class S3StorageProvider:
    async def put(self, key: str, body: bytes, content_type: str) -> None:
        await object_storage.upload_bytes(object_key=key, body=body, content_type=content_type)

    async def delete(self, key: str) -> None:
        await object_storage.delete_object(key)

    async def signed_download(self, key: str, expires_in: int) -> str:
        return await object_storage.presigned_download_url(key, expires_in=expires_in)

    async def signed_upload(self, key: str, content_type: str, expires_in: int) -> str:
        return await object_storage.presigned_upload_url(
            key, content_type=content_type, expires_in=expires_in
        )


class LocalStorageProvider:
    def __init__(self, root: str) -> None:
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        path = (self.root / key).resolve()
        if self.root not in path.parents:
            raise ValueError("storage key escapes local storage root")
        return path

    async def put(self, key: str, body: bytes, content_type: str) -> None:  # noqa: ARG002 - storage protocol
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(body)

    async def delete(self, key: str) -> None:
        self._path(key).unlink(missing_ok=True)

    async def signed_download(self, key: str, expires_in: int) -> str:
        expires = int(datetime.now(UTC).timestamp()) + expires_in
        message = f"{key}:{expires}".encode()
        signature = hmac.new(settings.JWT_SECRET.encode(), message, hashlib.sha256).hexdigest()
        return (
            f"/api/v1/storage/download/{quote(key, safe='')}?expires={expires}"
            f"&signature={signature}"
        )

    async def signed_upload(self, key: str, content_type: str, expires_in: int) -> str:
        expires = int(datetime.now(UTC).timestamp()) + expires_in
        message = f"upload:{key}:{content_type}:{expires}".encode()
        signature = hmac.new(settings.JWT_SECRET.encode(), message, hashlib.sha256).hexdigest()
        return (
            f"/api/v1/storage/upload/{quote(key, safe='')}?expires={expires}&signature={signature}"
        )


@dataclass(frozen=True, slots=True)
class StorageObjectResult:
    object_id: str
    object_key: str
    size_bytes: int
    checksum_sha256: str
    signed_download_url: str | None = None


class StorageService:
    def __init__(self, db: AsyncSession, provider: StorageProviderPort | None = None) -> None:
        self.db = db
        self.provider = provider or (
            LocalStorageProvider(settings.STORAGE_LOCAL_ROOT)
            if settings.STORAGE_PROVIDER == "local"
            else S3StorageProvider()
        )

    async def create_object(
        self,
        *,
        owner_id: str,
        body: bytes,
        filename: str,
        content_type: str,
        tenant_id: str | None = None,
        retention_until: datetime | None = None,
        expires_at: datetime | None = None,
    ) -> StorageObjectResult:
        if not body:
            raise HTTPException(status_code=400, detail="Storage object cannot be empty")
        if len(body) > settings.STORAGE_MAX_OBJECT_BYTES:
            raise HTTPException(status_code=413, detail="Storage object exceeds its size limit")
        if content_type.startswith("image/") and len(body) > settings.STORAGE_AVATAR_MAX_BYTES:
            raise HTTPException(status_code=413, detail="Image exceeds its size limit")
        if not filename.strip() or any(char in content_type for char in "\r\n"):
            raise HTTPException(status_code=422, detail="Invalid storage metadata")
        usage = await self.db.scalar(
            select(func.coalesce(func.sum(StorageObject.size_bytes), 0)).where(
                StorageObject.owner_id == owner_id,
                StorageObject.status == "active",
            )
        )
        if int(usage or 0) + len(body) > settings.STORAGE_QUOTA_BYTES_PER_USER:
            raise HTTPException(status_code=413, detail="Storage quota exceeded")
        safe_filename = os.path.basename(filename).replace("\\", "_")
        object_key = f"users/{owner_id}/{hashlib.sha256(body).hexdigest()}-{safe_filename}"
        checksum = hashlib.sha256(body).hexdigest()
        existing = await self.db.scalar(
            select(StorageObject).where(
                StorageObject.owner_id == owner_id,
                StorageObject.object_key == object_key,
                StorageObject.status == "active",
            )
        )
        if existing:
            return StorageObjectResult(
                existing.id,
                existing.object_key,
                existing.size_bytes,
                existing.checksum_sha256,
            )
        await self.provider.put(object_key, body, content_type)
        row = StorageObject(
            owner_id=owner_id,
            tenant_id=tenant_id,
            object_key=object_key,
            original_filename=safe_filename,
            content_type=content_type,
            size_bytes=len(body),
            checksum_sha256=checksum,
            retention_until=retention_until,
            expires_at=expires_at,
        )
        self.db.add(row)
        await self.db.flush()
        return StorageObjectResult(row.id, row.object_key, row.size_bytes, row.checksum_sha256)

    async def signed_upload(self, *, owner_id: str, filename: str, content_type: str) -> str:
        safe_filename = os.path.basename(filename).replace("\\", "_")
        digest = hashlib.sha256(safe_filename.encode()).hexdigest()
        key = f"users/{owner_id}/uploads/{digest}-{safe_filename}"
        return await self.provider.signed_upload(
            key, content_type, settings.STORAGE_SIGNED_URL_TTL_SECONDS
        )

    async def signed_download(self, *, owner_id: str, object_id: str) -> StorageObjectResult:
        row = await self.db.scalar(
            select(StorageObject).where(
                StorageObject.id == object_id,
                StorageObject.owner_id == owner_id,
                StorageObject.status == "active",
            )
        )
        if row is None or (row.expires_at and row.expires_at <= datetime.now(UTC)):
            raise HTTPException(status_code=404, detail="Storage object not found")
        url = await self.provider.signed_download(
            row.object_key, settings.STORAGE_SIGNED_URL_TTL_SECONDS
        )
        return StorageObjectResult(row.id, row.object_key, row.size_bytes, row.checksum_sha256, url)

    async def delete_object(self, *, owner_id: str, object_id: str) -> None:
        row = await self.db.scalar(
            select(StorageObject).where(
                StorageObject.id == object_id, StorageObject.owner_id == owner_id
            )
        )
        if row is None:
            raise HTTPException(status_code=404, detail="Storage object not found")
        await self.provider.delete(row.object_key)
        row.status = "deleted"
        row.deleted_at = datetime.now(UTC)
        await self.db.flush()

    async def cleanup_expired(self, *, now: datetime | None = None, limit: int = 100) -> int:
        current = now or datetime.now(UTC)
        result = await self.db.execute(
            select(StorageObject)
            .where(
                StorageObject.status == "active",
                (StorageObject.expires_at <= current) | (StorageObject.retention_until <= current),
            )
            .limit(limit)
        )
        rows = list(result.scalars())
        for row in rows:
            await self.provider.delete(row.object_key)
            row.status = "deleted"
            row.deleted_at = current
        await self.db.flush()
        return len(rows)
