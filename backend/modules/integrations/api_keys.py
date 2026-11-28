import hashlib
import hmac
import secrets
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import select

from backend.core.audit import AuditRepository
from backend.core.pagination import DEFAULT_PAGE_LIMIT
from backend.core.rate_limit import check_rate_limit
from backend.modules.platform.models import ApiKey
from backend.modules.platform.service import PlatformConfigService
from backend.modules.identity.models import User


class ApiKeyService(PlatformConfigService):
    async def list_api_keys_for_user(
        self,
        user: User,
        *,
        limit: int = DEFAULT_PAGE_LIMIT,
        offset: int = 0,
    ) -> tuple[list[ApiKey], int]:
        await self.ensure_module_enabled("api_keys")
        return await self.repo.list_api_keys_for_user(user.id, limit=limit, offset=offset)

    async def create_api_key_for_user(
        self,
        user: User,
        name: str,
        *,
        scopes: list[str] | None = None,
        expires_at: datetime | None = None,
        tenant_id: str | None = None,
        rate_limit_per_minute: int = 60,
        rotated_from_id: str | None = None,
    ) -> tuple[ApiKey, str]:
        await self.ensure_module_enabled("api_keys")
        raw_token = f"gap_{secrets.token_urlsafe(32)}"
        api_key = await self.repo.create_api_key(
            user_id=user.id,
            name=name,
            key_prefix=raw_token[:12],
            key_hash=self._hash_secret(raw_token),
            scopes_json=sorted(set(scopes or [])),
            expires_at=expires_at,
            tenant_id=tenant_id,
            rate_limit_per_minute=rate_limit_per_minute,
            rotated_from_id=rotated_from_id,
        )
        await AuditRepository(self.db).log(
            "api_key.created",
            user_id=user.id,
            resource_type="api_key",
            resource_id=api_key.id,
            metadata={"scopes": api_key.scopes_json, "tenant_id": tenant_id},
        )
        await self.db.commit()
        await self.db.refresh(api_key)
        return api_key, raw_token

    async def rotate_api_key_for_user(
        self,
        user: User,
        api_key_id: str,
        *,
        expires_at: datetime | None = None,
        rate_limit_per_minute: int = 60,
    ) -> tuple[ApiKey, str]:
        await self.ensure_module_enabled("api_keys")
        previous = await self.repo.get_api_key_for_user(user.id, api_key_id)
        if not previous:
            raise HTTPException(status_code=404, detail="API key not found")
        if previous.revoked_at:
            raise HTTPException(status_code=409, detail="API key is already revoked")
        previous.revoked_at = datetime.now(UTC)
        replacement, plaintext = await self.create_api_key_for_user(
            user,
            previous.name,
            scopes=list(previous.scopes_json or []),
            expires_at=expires_at if expires_at is not None else previous.expires_at,
            tenant_id=previous.tenant_id,
            rate_limit_per_minute=rate_limit_per_minute,
            rotated_from_id=previous.id,
        )
        await AuditRepository(self.db).log(
            "api_key.rotated",
            user_id=user.id,
            resource_type="api_key",
            resource_id=replacement.id,
            metadata={"rotated_from_id": previous.id},
        )
        await self.db.commit()
        await self.db.refresh(replacement)
        return replacement, plaintext

    async def revoke_api_key_for_user(self, user: User, api_key_id: str) -> ApiKey:
        await self.ensure_module_enabled("api_keys")
        api_key = await self.repo.get_api_key_for_user(user.id, api_key_id)
        if not api_key:
            raise HTTPException(status_code=404, detail="API key not found")
        api_key.revoked_at = datetime.now(UTC)
        await AuditRepository(self.db).log(
            "api_key.revoked", user_id=user.id, resource_type="api_key", resource_id=api_key.id
        )
        await self.db.commit()
        await self.db.refresh(api_key)
        return api_key

    @staticmethod
    def _hash_secret(raw_value: str) -> str:
        return hashlib.sha256(raw_value.encode("utf-8")).hexdigest()

    async def verify_api_key(
        self, raw_token: str, *, required_scope: str | None = None, tenant_id: str | None = None
    ) -> ApiKey | None:
        key_hash = self._hash_secret(raw_token)
        candidates = await self.db.scalars(
            select(ApiKey).where(ApiKey.key_prefix == raw_token[:12])
        )
        now = datetime.now(UTC)
        for candidate in candidates:
            if not hmac.compare_digest(candidate.key_hash, key_hash):
                continue
            if candidate.revoked_at or (candidate.expires_at and candidate.expires_at <= now):
                return None
            if tenant_id is not None and candidate.tenant_id != tenant_id:
                return None
            if required_scope and required_scope not in (candidate.scopes_json or []):
                return None
            await check_rate_limit(
                f"rate_limit:api_key:{candidate.id}", candidate.rate_limit_per_minute, 60
            )
            candidate.last_used_at = now
            await self.db.flush()
            return candidate
        return None
