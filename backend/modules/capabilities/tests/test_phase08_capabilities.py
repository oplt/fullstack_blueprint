from pathlib import Path

import pytest

from backend.modules.capabilities.analytics import sanitize_properties
from backend.modules.capabilities.integrations import IntegrationSecretCipher, OutboundUrlPolicy
from backend.modules.capabilities.search import SearchResult, SearchService
from backend.modules.capabilities.storage import LocalStorageProvider
from backend.modules.platform.webhook_delivery import (
    sign_webhook_payload,
    verify_webhook_signature,
)


def test_analytics_removes_sensitive_and_complex_values() -> None:
    assert sanitize_properties(
        {
            "plan": "pro",
            "count": 2,
            "prompt": "do not persist",
            "document_content": "do not persist",
            "nested": {"secret": "x"},
        }
    ) == {"plan": "pro", "count": 2}


def test_integration_secrets_are_reversible_but_not_plaintext() -> None:
    cipher = IntegrationSecretCipher("test-secret")
    encrypted = cipher.encrypt({"access_token": "never-log-this"})
    assert "never-log-this" not in encrypted
    assert cipher.decrypt(encrypted) == {"access_token": "never-log-this"}


@pytest.mark.asyncio
async def test_outbound_policy_rejects_private_ip() -> None:
    with pytest.raises(Exception, match="private"):
        await OutboundUrlPolicy.validate("https://127.0.0.1")


@pytest.mark.asyncio
async def test_search_service_enforces_tenant_boundary() -> None:
    class Provider:
        async def search(self, query: str, *, tenant_id: str, limit: int) -> list[SearchResult]:
            return [
                SearchResult("doc", "one", query, "safe", 1.0, tenant_id),
                SearchResult("doc", "two", query, "foreign", 0.9, "other-tenant"),
            ]

    results = await SearchService(Provider()).search("needle", tenant_id="tenant-a")
    assert [item.resource_id for item in results] == ["one"]


@pytest.mark.asyncio
async def test_local_storage_rejects_path_escape(tmp_path: Path) -> None:
    provider = LocalStorageProvider(str(tmp_path))
    with pytest.raises(ValueError):
        provider._path("../../outside")


def test_webhook_signature_is_versioned_and_replay_limited() -> None:
    body = '{"event":"created"}'
    signature = sign_webhook_payload("secret", {"event": "created"}, timestamp=100)
    assert verify_webhook_signature("secret", body, signature, 100, now=100)
    assert not verify_webhook_signature("secret", body, signature, 100, now=401)
