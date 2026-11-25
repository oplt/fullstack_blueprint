import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from backend.modules.ai.repository import AiRepository


@pytest.mark.asyncio
async def test_workflow_resume_transition_is_conditional_on_current_status():
    db = MagicMock()
    db.execute = AsyncMock(return_value=SimpleNamespace(scalar_one_or_none=lambda: "run-1"))
    repository = AiRepository(db)

    transitioned = await repository.transition_workflow(
        "run-1",
        expected_statuses={"pending", "failed"},
        values={"status": "running", "last_error": None},
    )

    unittest.TestCase().assertTrue(transitioned)
    statement = str(db.execute.await_args.args[0])
    unittest.TestCase().assertIn("ai_workflow_runs.status IN", statement)
    unittest.TestCase().assertIn("ai_workflow_runs.cancellation_requested IS false", statement)
