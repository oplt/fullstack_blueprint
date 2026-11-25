"""Application-owned workflow port with database and optional Temporal backends."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from enum import StrEnum
from typing import Any, Protocol


class WorkflowStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    AWAITING_APPROVAL = "awaiting_approval"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass(frozen=True, slots=True)
class WorkflowCheckpoint:
    workflow_id: str
    sequence: int
    status: WorkflowStatus
    state: dict[str, Any]


class WorkflowPort(Protocol):
    async def checkpoint(self, checkpoint: WorkflowCheckpoint) -> None: ...

    async def cancel(self, workflow_id: str) -> None: ...

    async def resume(self, workflow_id: str) -> dict[str, Any]: ...


class DatabaseWorkflowBackend:
    """Default backend; callers persist checkpoints in their request session."""

    def __init__(
        self,
        *,
        persist: Callable[[WorkflowCheckpoint], Awaitable[None]],
        load: Callable[[str], Awaitable[dict[str, Any]]],
        cancel_callback: Callable[[str], Awaitable[None]],
    ) -> None:
        self._persist = persist
        self._load = load
        self._cancel = cancel_callback

    async def checkpoint(self, checkpoint: WorkflowCheckpoint) -> None:
        await self._persist(checkpoint)

    async def cancel(self, workflow_id: str) -> None:
        await self._cancel(workflow_id)

    async def resume(self, workflow_id: str) -> dict[str, Any]:
        return await self._load(workflow_id)


class TemporalWorkflowBackend:
    """Optional adapter boundary; Temporal is not required by the base app."""

    def __init__(self, client: Any) -> None:
        self.client = client

    @classmethod
    async def connect(cls, target: str, namespace: str = "default") -> TemporalWorkflowBackend:
        try:
            from temporalio.client import Client  # type: ignore[reportMissingImports]
        except ImportError as exc:  # pragma: no cover - optional integration
            raise RuntimeError("Install the durable extra to enable Temporal") from exc
        return cls(await Client.connect(target, namespace=namespace))

    async def checkpoint(self, checkpoint: WorkflowCheckpoint) -> None:
        await self.client.signal_workflow(
            checkpoint.workflow_id,
            "checkpoint",
            checkpoint.state,
        )

    async def cancel(self, workflow_id: str) -> None:
        await self.client.get_workflow_handle(workflow_id).cancel()

    async def resume(self, workflow_id: str) -> dict[str, Any]:
        return await self.client.get_workflow_handle(workflow_id).query("state")
