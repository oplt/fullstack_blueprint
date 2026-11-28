from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from backend.modules.memory import service as memory_service_module
from backend.modules.memory.domain import MemoryItem, MemoryMetadata
from backend.modules.memory.domain import (
    AgentScope,
    MemoryLevel,
    MemoryPrivacy,
    MemoryType,
)
from backend.modules.memory.service import MemoryService


def _memory_item(*, memory_id: str, user_id: str, scope: AgentScope | None = None) -> MemoryItem:
    return MemoryItem(
        id=memory_id,
        content="tenant-private content",
        metadata=MemoryMetadata(
            memory_level=MemoryLevel.AGENT,
            memory_type=MemoryType.FACT,
            user_id=user_id,
            agent_id="default",
            scope=scope,
        ),
    )


@pytest.mark.asyncio
async def test_agent_memory_metadata_cannot_change_owner_or_global_scope(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    service = object.__new__(MemoryService)
    service.config = SimpleNamespace(
        enabled=True,
        write_enabled=True,
        consent_required=False,
        sensitive_filter_enabled=True,
        default_retention_days=30,
        session_ttl_days=14,
        audit_enabled=False,
    )
    service.policy = MagicMock()
    service.policy.evaluate.return_value = SimpleNamespace(
        allowed=True,
        reason=None,
        adjusted_confidence=None,
        privacy=MemoryPrivacy.NORMAL,
    )
    service.mem0 = SimpleNamespace(add=AsyncMock(return_value={"id": "memory-1"}))
    service.registry_repo = SimpleNamespace(register=AsyncMock())
    service.audit_repo = MagicMock()
    monkeypatch.setattr(
        memory_service_module,
        "invalidate_memory_search_cache",
        AsyncMock(),
    )

    await service.remember(
        user_id="tenant-a-user",
        agent_id="default",
        content="A private tenant decision.",
        memory_level="agent",
        metadata={
            "user_id": "tenant-b-user",
            "memory_level": "agent",
            "scope": "global_agent",
        },
    )

    stored = service.mem0.add.await_args.kwargs["metadata"]
    assert stored["user_id"] == "tenant-a-user"
    assert stored["memory_level"] == "agent"
    assert stored["scope"] == "user_agent"
    assert service.registry_repo.register.await_args.kwargs["user_id"] == "tenant-a-user"
    assert service.registry_repo.register.await_args.kwargs["scope"] == "user_agent"


@pytest.mark.asyncio
async def test_search_uses_registry_owner_instead_of_external_memory_metadata() -> None:
    service = object.__new__(MemoryService)
    service.registry_repo = SimpleNamespace(
        get_active_by_external_ids=AsyncMock(
            return_value=[
                SimpleNamespace(
                    external_memory_id="memory-1",
                    user_id="tenant-a-user",
                    project_id=None,
                    memory_level="agent",
                    agent_id="default",
                    run_id=None,
                    scope="user_agent",
                    status="active",
                    expires_at=None,
                )
            ]
        )
    )
    service.project_access = SimpleNamespace(
        filter_accessible_project_ids=AsyncMock(return_value=set())
    )

    result = await service._filter_authorized_read_items(
        "tenant-b-user",
        [_memory_item(memory_id="memory-1", user_id="tenant-b-user")],
    )

    assert result == []


@pytest.mark.asyncio
async def test_cached_project_memory_is_filtered_after_membership_removal() -> None:
    service = object.__new__(MemoryService)
    service.registry_repo = SimpleNamespace(
        get_active_by_external_ids=AsyncMock(
            return_value=[
                SimpleNamespace(
                    external_memory_id="memory-1",
                    user_id="tenant-a-user",
                    project_id="project-1",
                    memory_level="project",
                    agent_id="default",
                    run_id=None,
                    scope=None,
                    status="active",
                    expires_at=None,
                )
            ]
        )
    )
    service.project_access = SimpleNamespace(
        filter_accessible_project_ids=AsyncMock(return_value=set())
    )

    result = await service._filter_authorized_read_items(
        "tenant-a-user",
        [_memory_item(memory_id="memory-1", user_id="tenant-a-user")],
    )

    assert result == []
    service.project_access.filter_accessible_project_ids.assert_awaited_once_with(
        "tenant-a-user", {"project-1"}
    )


@pytest.mark.asyncio
async def test_get_memory_fails_closed_when_registry_entry_is_missing() -> None:
    service = object.__new__(MemoryService)
    service.registry_repo = SimpleNamespace(get_by_external_id=AsyncMock(return_value=None))
    service.mem0 = SimpleNamespace(
        get=AsyncMock(
            return_value=_memory_item(
                memory_id="memory-1", user_id="", scope=AgentScope.GLOBAL_AGENT
            )
        )
    )

    with pytest.raises(HTTPException) as error:
        await service.get_memory(user_id="tenant-b-user", memory_id="memory-1")

    assert error.value.status_code == 404
    service.mem0.get.assert_not_awaited()


@pytest.mark.asyncio
@pytest.mark.parametrize("operation", ["forget", "correct"])
@pytest.mark.parametrize("registry_user_id", [None, "tenant-a-user"])
async def test_non_admin_cannot_mutate_unowned_memory(
    operation: str,
    registry_user_id: str | None,
) -> None:
    service = object.__new__(MemoryService)
    service.registry_repo = SimpleNamespace(
        get_by_external_id=AsyncMock(
            return_value=SimpleNamespace(
                status="active",
                user_id=registry_user_id,
                memory_level="agent",
                agent_id="default",
                run_id=None,
                project_id=None,
            )
        )
    )
    service.mem0 = SimpleNamespace(delete=AsyncMock())

    with pytest.raises(HTTPException) as error:
        if operation == "forget":
            await service.forget(
                user_id="tenant-b-user",
                memory_id="global-memory",
                reason="test",
            )
        else:
            await service.correct(
                user_id="tenant-b-user",
                memory_id="global-memory",
                content="replacement",
                reason="test",
            )

    assert error.value.status_code == 403
    service.mem0.delete.assert_not_awaited()
