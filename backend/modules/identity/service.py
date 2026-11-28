from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.cache import cache_get_or_load_model
from backend.core.config import settings
from backend.core.pagination import DEFAULT_PAGE_LIMIT
from backend.core.resource_cache import (
    get_cached_model_list,
    invalidate_user_directory_cache,
    invalidate_user_profile_cache,
    set_cached_model_list,
    user_directory_cache_key,
    user_profile_cache_key,
)
from backend.core.security import hash_password_async, verify_password_async
from backend.modules.identity.models import RefreshSession, User, UserProfile
from backend.modules.identity.repository import (
    IdentityRepository,
    ProfileRepository,
    UsersRepository,
)
from backend.modules.identity.schemas import (
    ProfileResponse,
    UserDirectoryResponse,
    profile_to_response,
)


class UsersService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = UsersRepository(db)
        self.identity_repo = IdentityRepository(db)

    async def save(self) -> None:
        await self.db.commit()

    async def update_profile(self, user: User, full_name: str | None) -> User:
        updated = await self.repo.update_profile(user, full_name)
        await self.db.commit()
        await self.db.refresh(updated)
        await invalidate_user_directory_cache()
        return updated

    async def change_password(self, user: User, current_password: str, new_password: str) -> None:
        if not await verify_password_async(current_password, user.password_hash):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        user.password_hash = await hash_password_async(new_password)
        await self.identity_repo.revoke_all_refresh_sessions_for_user(user.id)
        await self.db.flush()
        await self.db.commit()

    async def list_sessions(self, user: User) -> list[RefreshSession]:
        return await self.identity_repo.list_active_sessions(user.id)

    async def revoke_session(self, user: User, session_id: str) -> None:
        session = await self.identity_repo.get_session_by_id(session_id)
        if not session or session.user_id != user.id:
            raise HTTPException(status_code=404, detail="Session not found")
        await self.identity_repo.revoke_refresh_session(session)
        await self.db.commit()

    async def list_directory(
        self,
        *,
        limit: int = DEFAULT_PAGE_LIMIT,
        offset: int = 0,
    ) -> tuple[list[UserDirectoryResponse], int]:
        cache_key = user_directory_cache_key(limit, offset)
        cached = await get_cached_model_list(cache_key, UserDirectoryResponse)
        if cached is not None:
            return cached

        users, total = await self.repo.list_active_users(limit=limit, offset=offset)
        items = [
            UserDirectoryResponse(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
            )
            for user in users
        ]
        await set_cached_model_list(
            cache_key,
            items,
            total=total,
            ttl_seconds=settings.CACHE_USER_DIRECTORY_TTL_SECONDS,
        )
        return items, total


class ProfileService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ProfileRepository(db)

    async def get_profile_response(self, user_id: str) -> ProfileResponse:
        async def loader() -> ProfileResponse:
            profile = await self.repo.get_or_create(user_id)
            return profile_to_response(profile)

        return await cache_get_or_load_model(
            user_profile_cache_key(user_id),
            ProfileResponse,
            ttl_seconds=settings.CACHE_USER_PROFILE_TTL_SECONDS,
            loader=loader,
        )

    async def get_profile(self, user_id: str) -> UserProfile:
        return await self.repo.get_or_create(user_id)

    async def update_profile(
        self,
        user_id: str,
        bio: str | None,
        location: str | None,
        website: str | None,
    ) -> UserProfile:
        profile = await self.repo.get_or_create(user_id)
        await self.repo.update(profile, bio=bio, location=location, website=website)
        await self.db.commit()
        await self.db.refresh(profile)
        await invalidate_user_profile_cache(user_id)
        return profile

    async def set_avatar_url(self, user_id: str, url: str | None) -> UserProfile:
        profile = await self.repo.get_or_create(user_id)
        profile.avatar_url = url
        if url is None:
            profile.avatar_storage_key = None
        await self.db.commit()
        await self.db.refresh(profile)
        await invalidate_user_profile_cache(user_id)
        return profile

    async def replace_avatar(
        self,
        user_id: str,
        avatar_url: str,
        storage_key: str,
    ) -> tuple[UserProfile, str | None]:
        profile = await self.repo.get_or_create(user_id)
        previous_key = profile.avatar_storage_key
        profile.avatar_url = avatar_url
        profile.avatar_storage_key = storage_key
        await self.db.commit()
        await self.db.refresh(profile)
        await invalidate_user_profile_cache(user_id)
        return profile, previous_key

    async def clear_avatar(self, user_id: str) -> str | None:
        profile = await self.repo.get_or_create(user_id)
        previous_key = profile.avatar_storage_key
        profile.avatar_url = None
        profile.avatar_storage_key = None
        await self.db.commit()
        await self.db.refresh(profile)
        await invalidate_user_profile_cache(user_id)
        return previous_key
