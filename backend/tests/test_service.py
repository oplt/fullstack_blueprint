from datetime import date, timedelta
from http import HTTPStatus
from types import SimpleNamespace
from typing import cast
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.calendar import service as calendar_service
from backend.modules.calendar.service import CalendarService
from backend.modules.identity.models import User


@pytest.mark.asyncio
async def test_annual_calendar_range_is_accepted_and_larger_ranges_are_rejected(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        calendar_service,
        "get_cached_model_items",
        AsyncMock(return_value=[]),
    )
    service = CalendarService(cast(AsyncSession, None))
    user = cast(User, SimpleNamespace(id="calendar-test-user"))
    annual_start = date(2024, 1, 1)

    if await service.list_items(user, annual_start, date(2025, 1, 1)) != []:
        pytest.fail("Expected annual calendar range to return cached items")

    with pytest.raises(HTTPException) as error:
        await service.list_items(user, annual_start, annual_start + timedelta(days=379))

    if error.value.status_code != HTTPStatus.BAD_REQUEST:
        pytest.fail("Expected oversized calendar range to return HTTP 400")
