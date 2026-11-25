import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from backend.modules.rag.infrastructure.repositories import RagRepository


@pytest.mark.asyncio
async def test_ingestion_job_claim_only_moves_pending_or_failed_jobs_to_running():
    db = MagicMock()
    db.execute = AsyncMock(return_value=SimpleNamespace(scalar_one_or_none=lambda: "job-1"))
    repository = RagRepository(db)

    claimed = await repository.claim_ingestion_job("job-1")

    unittest.TestCase().assertTrue(claimed)
    statement = str(db.execute.await_args.args[0])
    unittest.TestCase().assertIn("rag_ingestion_jobs.status IN", statement)
