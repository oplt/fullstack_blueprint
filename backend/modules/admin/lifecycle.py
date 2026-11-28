"""Asynchronous data export/import/deletion job contracts."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.capabilities.models import DataLifecycleJob

LifecycleRunner = Callable[[DataLifecycleJob], Awaitable[None]]


class ProductLifecycleService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def request(
        self,
        *,
        tenant_id: str,
        user_id: str,
        operation: str,
        idempotency_key: str,
    ) -> DataLifecycleJob:
        existing = await self.db.scalar(
            select(DataLifecycleJob).where(
                DataLifecycleJob.tenant_id == tenant_id,
                DataLifecycleJob.idempotency_key == idempotency_key,
            )
        )
        if existing:
            return existing
        if operation not in {"export", "import", "delete_account", "delete_organization"}:
            raise ValueError("unsupported lifecycle operation")
        row = DataLifecycleJob(
            tenant_id=tenant_id,
            requested_by_user_id=user_id,
            operation=operation,
            idempotency_key=idempotency_key,
        )
        self.db.add(row)
        await self.db.flush()
        return row

    async def complete(self, job: DataLifecycleJob, *, result_object_id: str | None = None) -> None:
        job.status = "completed"
        job.progress_percent = 100
        job.result_object_id = result_object_id
        job.completed_at = datetime.now(UTC)
        await self.db.flush()

    async def fail(self, job: DataLifecycleJob, message: str) -> None:
        job.status = "failed"
        job.error_message = message[:1000]
        job.completed_at = datetime.now(UTC)
        await self.db.flush()
