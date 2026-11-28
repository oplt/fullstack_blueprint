"""Tenant-scoped external integration registry and outbound URL policy."""

from __future__ import annotations

import asyncio
import base64
import hashlib
import ipaddress
import json
import socket
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from urllib.parse import urlparse

from cryptography.fernet import Fernet
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import settings
from backend.modules.capabilities.models import (
    IntegrationAuditEvent,
    IntegrationDefinition,
    TenantIntegration,
)


class OutboundUrlPolicy:
    @staticmethod
    async def validate(url: str, *, allowed_hosts: set[str] | None = None) -> str:
        parsed = urlparse(url)
        host = (parsed.hostname or "").lower().rstrip(".")
        if parsed.scheme != "https" or not host or parsed.username or parsed.password:
            raise HTTPException(status_code=422, detail="Outbound integration URL must be HTTPS")
        configured = {
            item.strip().lower().rstrip(".")
            for item in settings.INTEGRATION_ALLOWED_HOSTS.split(",")
            if item.strip()
        }
        hosts = allowed_hosts or configured
        if hosts and host not in hosts:
            raise HTTPException(status_code=422, detail="Integration host is not allowlisted")
        addresses = await _resolve_public_addresses(host, parsed.port or 443)
        if not addresses:
            raise HTTPException(status_code=422, detail="Integration host could not be resolved")
        return url


async def _resolve_public_addresses(host: str, port: int) -> set[str]:
    try:
        direct = ipaddress.ip_address(host)
        addresses = {str(direct)}
    except ValueError:
        try:
            results = await asyncio.to_thread(
                socket.getaddrinfo, host, port, type=socket.SOCK_STREAM
            )
        except socket.gaierror as exc:
            raise HTTPException(
                status_code=422, detail="Integration host could not be resolved"
            ) from exc
        addresses = {str(result[4][0]) for result in results}
    if any(not ipaddress.ip_address(address).is_global for address in addresses):
        raise HTTPException(
            status_code=422, detail="Integration host resolves to a private address"
        )
    return addresses


class IntegrationSecretCipher:
    def __init__(self, secret: str | None = None) -> None:
        raw = hashlib.sha256((secret or settings.JWT_SECRET).encode()).digest()
        self._fernet = Fernet(base64.urlsafe_b64encode(raw))

    def encrypt(self, credentials: dict[str, str]) -> str:
        return self._fernet.encrypt(json.dumps(credentials, sort_keys=True).encode()).decode()

    def decrypt(self, ciphertext: str) -> dict[str, str]:
        return json.loads(self._fernet.decrypt(ciphertext.encode()).decode())


ConnectionTester = Callable[[dict[str, str]], Awaitable[bool]]
CredentialRefresher = Callable[[dict[str, str]], Awaitable[dict[str, str]]]


class IntegrationRegistry:
    def __init__(self, db: AsyncSession, cipher: IntegrationSecretCipher | None = None) -> None:
        self.db = db
        self.cipher = cipher or IntegrationSecretCipher()

    async def install(
        self,
        *,
        tenant_id: str,
        user_id: str,
        definition: IntegrationDefinition,
        credentials: dict[str, str],
        scopes: list[str],
    ) -> TenantIntegration:
        if not settings.INTEGRATIONS_ENABLED or not definition.enabled:
            raise HTTPException(status_code=503, detail="Integrations are disabled")
        missing = set(definition.required_scopes_json).difference(scopes)
        if missing:
            raise HTTPException(status_code=422, detail="Required integration scopes are missing")
        row = TenantIntegration(
            tenant_id=tenant_id,
            installed_by_user_id=user_id,
            integration_definition_id=definition.id,
            encrypted_credentials=self.cipher.encrypt(credentials),
            granted_scopes_json=scopes,
        )
        self.db.add(row)
        await self.db.flush()
        await self.audit(tenant_id, row.id, user_id, "installed", {"scopes": scopes})
        return row

    async def credentials(self, *, tenant_id: str, integration_id: str) -> dict[str, str]:
        row = await self.db.scalar(
            select(TenantIntegration).where(
                TenantIntegration.id == integration_id,
                TenantIntegration.tenant_id == tenant_id,
                TenantIntegration.status == "active",
            )
        )
        if row is None or not row.encrypted_credentials:
            raise HTTPException(status_code=404, detail="Integration not found")
        return self.cipher.decrypt(row.encrypted_credentials)

    async def test_connection(
        self, *, tenant_id: str, integration_id: str, tester: ConnectionTester
    ) -> bool:
        row = await self.db.scalar(
            select(TenantIntegration).where(
                TenantIntegration.id == integration_id, TenantIntegration.tenant_id == tenant_id
            )
        )
        if row is None:
            raise HTTPException(status_code=404, detail="Integration not found")
        healthy = await tester(
            await self.credentials(tenant_id=tenant_id, integration_id=integration_id)
        )
        row.health_status = "healthy" if healthy else "unhealthy"
        row.last_checked_at = datetime.now(UTC)
        await self.audit(tenant_id, row.id, None, "connection_test", {"healthy": healthy})
        return healthy

    async def revoke(self, *, tenant_id: str, integration_id: str, user_id: str) -> None:
        row = await self.db.scalar(
            select(TenantIntegration).where(
                TenantIntegration.id == integration_id, TenantIntegration.tenant_id == tenant_id
            )
        )
        if row is None:
            raise HTTPException(status_code=404, detail="Integration not found")
        row.status = "revoked"
        row.revoked_at = datetime.now(UTC)
        row.encrypted_credentials = None
        await self.audit(tenant_id, row.id, user_id, "revoked", {})

    async def refresh(
        self,
        *,
        tenant_id: str,
        integration_id: str,
        user_id: str,
        refresher: CredentialRefresher,
    ) -> TenantIntegration:
        """Refresh OAuth-style credentials without exposing them to callers."""
        row = await self.db.scalar(
            select(TenantIntegration).where(
                TenantIntegration.id == integration_id,
                TenantIntegration.tenant_id == tenant_id,
                TenantIntegration.status == "active",
            )
        )
        if row is None or not row.encrypted_credentials:
            raise HTTPException(status_code=404, detail="Integration not found")
        refreshed = await refresher(self.cipher.decrypt(row.encrypted_credentials))
        row.encrypted_credentials = self.cipher.encrypt(refreshed)
        row.health_status = "unknown"
        row.updated_at = datetime.now(UTC)
        await self.audit(tenant_id, row.id, user_id, "credentials_refreshed", {})
        return row

    async def audit(
        self,
        tenant_id: str,
        integration_id: str | None,
        user_id: str | None,
        action: str,
        metadata: dict,
    ) -> None:
        self.db.add(
            IntegrationAuditEvent(
                tenant_id=tenant_id,
                integration_id=integration_id,
                user_id=user_id,
                action=action,
                metadata_json=metadata,
            )
        )
        await self.db.flush()
