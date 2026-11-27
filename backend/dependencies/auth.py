import logging

from fastapi import Cookie, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import settings
from backend.core.security import decode_token
from backend.dependencies.db import get_db
from backend.modules.identity_access.models import User
from backend.modules.identity_access.repository import IdentityRepository

logger = logging.getLogger("backend.authz")


async def _get_authenticated_user(access_token: str | None, db: AsyncSession) -> User:
    try:
        if not access_token:
            raise HTTPException(status_code=401, detail="Authentication required")
        payload = decode_token(access_token)
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user_id = payload.get("sub")
        session_id = payload.get("sid")
        if not isinstance(user_id, str) or not user_id:
            raise HTTPException(status_code=401, detail="Invalid token subject")
        if not isinstance(session_id, str) or not session_id:
            raise HTTPException(status_code=401, detail="Invalid token session")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc

    repo = IdentityRepository(db)
    user = await repo.get_user_for_active_session(user_id, session_id)
    if not user:
        raise HTTPException(status_code=401, detail="Session is no longer valid")

    return user


async def get_current_user(
    access_token: str | None = Cookie(default=None, alias=settings.ACCESS_COOKIE_NAME),
    db: AsyncSession = Depends(get_db),
) -> User:
    user = await _get_authenticated_user(access_token, db)
    if settings.REQUIRE_EMAIL_VERIFICATION and not user.is_verified:
        raise HTTPException(status_code=403, detail="Verify your email before accessing the app")
    return user


async def get_authenticated_user(
    access_token: str | None = Cookie(default=None, alias=settings.ACCESS_COOKIE_NAME),
    db: AsyncSession = Depends(get_db),
) -> User:
    return await _get_authenticated_user(access_token, db)
