from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, call

import pytest

from backend.modules.rag.domain import IngestionErrorCode, IngestionJobStatus
from backend.modules.rag.repository import RagRepository


@pytest.mark.parametrize(
    ("status", "error_code", "retry_count"),
    [
        (IngestionJobStatus.PENDING.value, None, 0),
        (
            IngestionJobStatus.FAILED.value,
            IngestionErrorCode.EMBEDDING_FAILED.value,
            1,
        ),
    ],
)
@pytest.mark.asyncio
async def test_ingestion_job_claim_moves_pending_or_retryable_failed_jobs_to_running(
    status: str, error_code: str | None, retry_count: int
) -> None:
    db = MagicMock()
    db.flush = AsyncMock()
    repository = RagRepository(db)
    document = SimpleNamespace(id="document-1", user_id="user-1", project_id="project-1")
    job = SimpleNamespace(
        id="job-1",
        document_id=document.id,
        user_id=document.user_id,
        project_id=document.project_id,
        status=status,
        error_code=error_code,
        error_message="previous attempt failed" if error_code else None,
        retry_count=0,
        max_retries=3,
        started_at=None,
        last_heartbeat_at=None,
        finished_at=None,
        progress_percent=50,
        malware_scan_status="complete",
    )
    repository.get_ingestion_job = AsyncMock(return_value=job)
    repository.get_document = AsyncMock(return_value=document)
    repository.get_latest_ingestion_job = AsyncMock(return_value=job)

    claimed = await repository.claim_ingestion_job("job-1")

    assert claimed
    assert job.status == IngestionJobStatus.RUNNING.value
    assert job.retry_count == retry_count
    assert job.started_at is not None
    assert job.last_heartbeat_at == job.started_at
    assert job.finished_at is None
    assert job.progress_percent == 0
    assert job.malware_scan_status == "pending"
    assert job.error_code is None
    assert job.error_message is None
    repository.get_document.assert_awaited_once_with(document.id, for_update=True)
    assert repository.get_ingestion_job.await_args_list == [
        call("job-1"),
        call("job-1", for_update=True),
    ]
    repository.get_latest_ingestion_job.assert_awaited_once_with(document.id)
    db.flush.assert_awaited_once()
