"""Bounded, resumable agent runtime independent of any model framework."""

from __future__ import annotations

import asyncio
import json
from collections.abc import Awaitable, Callable
from typing import Any, Protocol

from pydantic import BaseModel, Field

from backend.modules.agents.contracts import (
    AgentRunState,
    ToolApprovalRequired,
    ToolExecutionContext,
    ToolExecutionDenied,
    ToolExecutionResult,
    ToolSideEffect,
    TypedToolRegistry,
    immutable_action_hash,
)
from backend.modules.ai.contracts import (
    AiMessage,
    AiMessageRole,
    AiProviderRequest,
    AiProviderResponse,
    AiToolDefinition,
)
from backend.modules.ai.errors import AiErrorKind, AiProviderError


class AgentDefinitionConfig(BaseModel):
    key: str = Field(min_length=1, max_length=128)
    name: str = Field(min_length=1, max_length=255)
    instructions: str = Field(default="", max_length=32_000)
    provider_key: str = "local"
    model_name: str
    tool_ids: list[str] = Field(default_factory=list, max_length=64)
    max_steps: int = Field(default=8, ge=1, le=64)
    max_tool_calls: int = Field(default=8, ge=0, le=64)
    max_tokens: int = Field(default=16_000, ge=1)
    max_cost_micros: int | None = Field(default=None, ge=0)
    timeout_seconds: float = Field(default=60.0, gt=0, le=3600)


class ToolExecutionLedger(Protocol):
    async def get(self, idempotency_key: str) -> ToolExecutionResult | None: ...

    async def put(self, result: ToolExecutionResult) -> None: ...


class ToolAuditSink(Protocol):
    async def record(self, result: ToolExecutionResult, context: ToolExecutionContext) -> None: ...


class AgentModelPort(Protocol):
    async def generate_contract(self, request: AiProviderRequest) -> AiProviderResponse: ...


class InMemoryToolExecutionLedger:
    def __init__(self) -> None:
        self._results: dict[str, ToolExecutionResult] = {}

    async def get(self, idempotency_key: str) -> ToolExecutionResult | None:
        return self._results.get(idempotency_key)

    async def put(self, result: ToolExecutionResult) -> None:
        self._results[result.idempotency_key] = result


CheckpointCallback = Callable[[AgentRunState], Awaitable[None]]


class AgentRuntime:
    def __init__(
        self,
        *,
        provider: AgentModelPort,
        tools: TypedToolRegistry,
        ledger: ToolExecutionLedger | None = None,
        audit_sink: ToolAuditSink | None = None,
    ) -> None:
        self.provider = provider
        self.tools = tools
        self.ledger = ledger or InMemoryToolExecutionLedger()
        self.audit_sink = audit_sink

    async def run(
        self,
        definition: AgentDefinitionConfig,
        *,
        run_id: str,
        user_id: str,
        tenant_id: str,
        messages: list[AiMessage],
        permissions: frozenset[str] = frozenset(),
        is_admin: bool = False,
        approved_action_hashes: frozenset[str] = frozenset(),
        cancellation_event: asyncio.Event | None = None,
        checkpoint: CheckpointCallback | None = None,
        initial_state: AgentRunState | None = None,
    ) -> tuple[AgentRunState, AiProviderResponse | None]:
        state = initial_state or AgentRunState(
            run_id=run_id,
            messages=[message.model_dump(mode="json") for message in messages],
        )
        pending_tool_call = state.pending_tool_call if hasattr(state, "pending_tool_call") else None
        context = ToolExecutionContext(
            user_id=user_id,
            tenant_id=tenant_id,
            run_id=run_id,
            workflow_id=run_id,
            permissions=permissions,
            is_admin=is_admin,
            approved_action_hashes=approved_action_hashes,
        )

        try:
            async with asyncio.timeout(definition.timeout_seconds):
                while state.step < definition.max_steps:
                    if cancellation_event and cancellation_event.is_set():
                        state.status = "cancelled"
                        await self._checkpoint(state, checkpoint)
                        return state, None
                    if pending_tool_call is not None:
                        try:
                            result = await self._execute_tool(
                                pending_tool_call,
                                definition=definition,
                                context=context,
                            )
                        except ToolApprovalRequired as exc:
                            state.status = "awaiting_approval"
                            state.approval = exc.request
                            await self._checkpoint(state, checkpoint)
                            return state, None
                        state.messages.append(
                            {
                                "role": AiMessageRole.TOOL.value,
                                "tool_call_id": pending_tool_call["id"],
                                "content": json.dumps(result.output, sort_keys=True),
                            }
                        )
                        state.pending_tool_call = None
                        state.approval = None
                        pending_tool_call = None
                        state.step += 1
                        await self._checkpoint(state, checkpoint)
                        continue

                    state.step += 1
                    request = AiProviderRequest(
                        model=definition.model_name,
                        messages=[
                            AiMessage(
                                role=AiMessageRole.SYSTEM,
                                content=definition.instructions,
                            )
                        ]
                        + [AiMessage.model_validate(message) for message in state.messages],
                        tools=[
                            AiToolDefinition(
                                name=tool["name"],
                                description=tool["description"],
                                parameters=tool["parameters"],
                            )
                            for tool in self.tools.schemas(definition.tool_ids)
                        ],
                        metadata={
                            "run_id": run_id,
                            "user_id": user_id,
                            "tenant_id": tenant_id,
                            "provider_key": definition.provider_key,
                        },
                        cancellation_event=cancellation_event,
                    )
                    response = await self.provider.generate_contract(request)
                    state.input_tokens += response.usage.input_tokens
                    state.output_tokens += response.usage.output_tokens
                    state.estimated_cost_micros += int(response.raw_metadata.get("cost_micros", 0))
                    if (
                        definition.max_cost_micros is not None
                        and state.estimated_cost_micros > definition.max_cost_micros
                    ):
                        raise AiProviderError(
                            "Agent cost budget exceeded",
                            kind=AiErrorKind.BUDGET_EXCEEDED,
                            provider_key=definition.provider_key,
                        )
                    if state.total_tokens > definition.max_tokens:
                        raise AiProviderError(
                            "Agent token budget exceeded",
                            kind=AiErrorKind.BUDGET_EXCEEDED,
                            provider_key=definition.provider_key,
                        )
                    state.messages.append(
                        {
                            "role": AiMessageRole.ASSISTANT.value,
                            "content": response.output_text,
                        }
                    )
                    state.output_text = response.output_text
                    state.output_json = response.output_json
                    if not response.tool_calls:
                        state.status = "completed"
                        await self._checkpoint(state, checkpoint)
                        return state, response
                    state.tool_calls += len(response.tool_calls)
                    if state.tool_calls > definition.max_tool_calls:
                        raise AiProviderError(
                            "Agent tool-call budget exceeded",
                            kind=AiErrorKind.BUDGET_EXCEEDED,
                            provider_key=definition.provider_key,
                        )
                    for tool_call in response.tool_calls:
                        state.pending_tool_call = tool_call.model_dump(mode="json")
                        try:
                            result = await self._execute_tool(
                                state.pending_tool_call,
                                definition=definition,
                                context=context,
                            )
                        except ToolApprovalRequired as exc:
                            state.status = "awaiting_approval"
                            state.approval = exc.request
                            await self._checkpoint(state, checkpoint)
                            return state, None
                        state.messages.append(
                            {
                                "role": AiMessageRole.TOOL.value,
                                "tool_call_id": tool_call.id,
                                "content": json.dumps(result.output, sort_keys=True),
                            }
                        )
                        state.pending_tool_call = None
                    await self._checkpoint(state, checkpoint)
                state.status = "failed"
                state.last_error = "Agent maximum step limit reached"
                await self._checkpoint(state, checkpoint)
                return state, None
        except TimeoutError:
            state.status = "failed"
            state.last_error = "Agent execution timed out"
            await self._checkpoint(state, checkpoint)
            return state, None
        except asyncio.CancelledError:
            state.status = "cancelled"
            await self._checkpoint(state, checkpoint)
            raise
        except AiProviderError as exc:
            state.status = "failed"
            state.last_error = str(exc)
            await self._checkpoint(state, checkpoint)
            return state, None

    async def _execute_tool(
        self,
        tool_call: dict[str, Any],
        *,
        definition: AgentDefinitionConfig,
        context: ToolExecutionContext,
    ) -> ToolExecutionResult:
        tool_identifier = tool_call["name"]
        if tool_identifier not in definition.tool_ids:
            raise ToolExecutionDenied("Tool is not allowed for this agent")
        parameters = tool_call.get("arguments", {})
        registered = self.tools.get(tool_identifier)
        idempotency_key = immutable_action_hash(
            tool_identifier=tool_identifier,
            tool_version=registered.definition.version,
            parameters=parameters,
            tenant_id=context.tenant_id,
            run_id=context.run_id,
        )
        cached = await self.ledger.get(idempotency_key)
        if cached is not None:
            return cached
        max_attempts = registered.definition.retry_policy.max_attempts
        result: ToolExecutionResult | None = None
        for attempt in range(1, max_attempts + 1):
            try:
                result = await asyncio.wait_for(
                    self.tools.execute(
                        tool_identifier,
                        parameters,
                        context,
                        idempotency_key=idempotency_key,
                    ),
                    timeout=min(
                        definition.timeout_seconds,
                        registered.definition.timeout_seconds,
                    ),
                )
                result.attempts = attempt
                break
            except Exception as exc:
                if (
                    registered.definition.side_effect != ToolSideEffect.READ_ONLY
                    or attempt >= max_attempts
                    or not self._is_retryable_tool_error(exc, registered.definition.retry_policy)
                ):
                    raise
        if result is None:
            raise RuntimeError("Tool execution completed without a result")
        await self.ledger.put(result)
        if self.audit_sink is not None:
            await self.audit_sink.record(result, context)
        return result

    @staticmethod
    def _is_retryable_tool_error(exc: Exception, policy: Any) -> bool:
        if isinstance(exc, (TimeoutError, asyncio.TimeoutError)):
            kind = "timeout"
        elif isinstance(exc, AiProviderError):
            kind = exc.kind.value
        else:
            kind = type(exc).__name__
        return kind in policy.retryable_errors

    @staticmethod
    async def _checkpoint(state: AgentRunState, callback: CheckpointCallback | None) -> None:
        if callback is not None:
            await callback(state)
