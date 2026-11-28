from unittest.mock import AsyncMock

import pytest
from backend.modules.projects.repository import ProjectsRepository


@pytest.mark.asyncio
async def test_next_task_position_increments_existing_zero() -> None:
    db = AsyncMock()
    db.scalar.return_value = 0

    position = await ProjectsRepository(db).get_next_task_position("project", "backlog")

    assert position == 1


@pytest.mark.asyncio
async def test_next_task_position_starts_at_zero_for_empty_status() -> None:
    db = AsyncMock()
    db.scalar.return_value = None

    position = await ProjectsRepository(db).get_next_task_position("project", "backlog")

    assert position == 0
