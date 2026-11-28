from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from backend.modules.identity import auth as identity_service
from backend.modules.identity.auth import IdentityService
from fastapi import HTTPException


class _OneTimeRedis:
    def __init__(self) -> None:
        self.values = {}

    async def getdel(self, key: str):
        return self.values.pop(key, None)


@pytest.mark.asyncio
async def test_password_reset_token_cannot_be_reused(monkeypatch: pytest.MonkeyPatch) -> None:
    redis = _OneTimeRedis()
    account_id = "acct-42"
    redis.values["pwd_reset:hashed"] = account_id
    monkeypatch.setattr(identity_service, "redis_client", redis)
    monkeypatch.setattr(identity_service, "_hash_token", lambda _token: "hashed")
    monkeypatch.setattr(identity_service, "hash_password_async", AsyncMock(return_value="new-hash"))
    user = SimpleNamespace(id=account_id)
    user.password_hash = "fixture-digest-old"  # noqa: S105 - inert test fixture
    service = IdentityService.__new__(IdentityService)
    service.repo = SimpleNamespace(
        get_user_by_id=AsyncMock(return_value=user),
        revoke_all_refresh_sessions_for_user=AsyncMock(),
    )
    service.db = SimpleNamespace(commit=AsyncMock())

    await service.reset_password("reset-token", "NewPassword123!")
    with pytest.raises(HTTPException) as error:
        await service.reset_password("reset-token", "AnotherPassword123!")

    assert error.value.status_code == 400
    assert user.password_hash == "new-hash"  # noqa: S105 - inert test digest
    service.repo.revoke_all_refresh_sessions_for_user.assert_awaited_once_with(account_id)


@pytest.mark.asyncio
async def test_email_verification_token_cannot_be_reused(monkeypatch: pytest.MonkeyPatch) -> None:
    redis = _OneTimeRedis()
    redis.values["verify:hashed"] = "account-42"
    monkeypatch.setattr(identity_service, "redis_client", redis)
    monkeypatch.setattr(identity_service, "_hash_token", lambda _token: "hashed")
    user = SimpleNamespace(id="account-42", is_verified=False)
    service = IdentityService.__new__(IdentityService)
    service.repo = SimpleNamespace(get_user_by_id=AsyncMock(return_value=user))
    service.db = SimpleNamespace(commit=AsyncMock())

    await service.verify_email("verification-token")
    with pytest.raises(HTTPException) as error:
        await service.verify_email("verification-token")

    assert error.value.status_code == 400
    assert user.is_verified is True
