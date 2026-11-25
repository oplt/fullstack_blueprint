"""Application-owned contracts for safe agent and tool execution."""

from __future__ import annotations

import hashlib
import json
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any, Protocol

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter


class ToolSideEffect(StrEnum):
    READ_ONLY = "read_only"
    DATA_MODIFYING = "data_modifying"
    EXTERNAL_COMMUNICATION = "external_communication"
    FINANCIAL = "financial"
    DESTRUCTIVE = "destructive"


class ApprovalRequirement(StrEnum):
    NEVER = "never"
    SENSITIVE = "sensitive"
    ALWAYS = "always"


class ToolAuditPolicy(StrEnum):
    NONE = "none"
    METADATA = "metadata"
    FULL = "full"


class ToolRetryPolicy(BaseModel):
    max_attempts: int = Field(default=1, ge=1, le=5)
    retryable_errors: frozenset[str] = frozenset({"timeout", "transient", "rate_limit"})


class ToolDefinition(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    identifier: str = Field(min_length=2, max_length=160, pattern=r"^[a-zA-Z0-9_.:-]+$")
    version: int = Field(default=1, ge=1)
    description: str = Field(default="", max_length=4000)
    required_permissions: frozenset[str] = frozenset()
    allowed_tenants: frozenset[str] = frozenset()
    side_effect: ToolSideEffect = ToolSideEffect.READ_ONLY
    timeout_seconds: float = Field(default=10.0, gt=0, le=300)
    retry_policy: ToolRetryPolicy = Field(default_factory=ToolRetryPolicy)
    idempotent: bool = True
    approval_requirement: ApprovalRequirement = ApprovalRequirement.NEVER
    audit_policy: ToolAuditPolicy = ToolAuditPolicy.METADATA


class ToolExecutionContext(BaseModel):
    user_id: str
    tenant_id: str
    run_id: str
    workflow_id: str | None = None
    permissions: frozenset[str] = frozenset()
    is_admin: bool = False
    approved_action_hashes: frozenset[str] = frozenset()
    correlation_id: str | None = None


class ToolApprovalRequest(BaseModel):
    approval_id: str | None = None
    tool_identifier: str
    tool_version: int
    parameters_hash: str
    tenant_id: str
    run_id: str
    expires_at: str


class ToolExecutionResult(BaseModel):
    tool_identifier: str
    tool_version: int
    output: Any
    idempotency_key: str
    attempts: int = 1
    audit_metadata: dict[str, Any] = Field(default_factory=dict)


class ToolApprovalRequired(Exception):
    def __init__(self, request: ToolApprovalRequest):
        super().__init__(f"Approval required for tool {request.tool_identifier}")
        self.request = request


class ToolExecutionDenied(Exception):
    pass


ToolHandler = Callable[[Any, ToolExecutionContext], Awaitable[Any]]


@dataclass(slots=True)
class RegisteredTool:
    definition: ToolDefinition
    input_model: type[BaseModel]
    output_model: type[BaseModel]
    handler: ToolHandler

    @property
    def input_schema(self) -> dict[str, Any]:
        return self.input_model.model_json_schema()

    @property
    def output_schema(self) -> dict[str, Any]:
        return self.output_model.model_json_schema()


class ToolRegistryPort(Protocol):
    def get(self, identifier: str, version: int | None = None) -> RegisteredTool: ...

    def schemas(self, identifiers: list[str] | None = None) -> list[dict[str, Any]]: ...


class TypedToolRegistry:
    """Registry that validates input/output and enforces policy at execution."""

    def __init__(self) -> None:
        self._tools: dict[tuple[str, int], RegisteredTool] = {}

    def register(
        self,
        definition: ToolDefinition,
        *,
        input_model: type[BaseModel],
        output_model: type[BaseModel],
        handler: ToolHandler,
    ) -> None:
        key = (definition.identifier, definition.version)
        if key in self._tools:
            raise ValueError(
                f"Tool already registered: {definition.identifier}@{definition.version}"
            )
        self._tools[key] = RegisteredTool(definition, input_model, output_model, handler)

    def get(self, identifier: str, version: int | None = None) -> RegisteredTool:
        if version is not None:
            tool = self._tools.get((identifier, version))
        else:
            candidates = [tool for (name, _), tool in self._tools.items() if name == identifier]
            tool = max(candidates, key=lambda item: item.definition.version) if candidates else None
        if tool is None:
            raise KeyError(f"Unknown tool: {identifier}")
        return tool

    def schemas(self, identifiers: list[str] | None = None) -> list[dict[str, Any]]:
        allowed = set(identifiers or [])
        tools = [
            tool
            for tool in self._tools.values()
            if not allowed or tool.definition.identifier in allowed
        ]
        return [
            {
                "name": tool.definition.identifier,
                "description": tool.definition.description,
                "parameters": tool.input_schema,
                "version": tool.definition.version,
            }
            for tool in sorted(tools, key=lambda item: item.definition.identifier)
        ]

    async def execute(
        self,
        identifier: str,
        parameters: dict[str, Any],
        context: ToolExecutionContext,
        *,
        version: int | None = None,
        idempotency_key: str | None = None,
    ) -> ToolExecutionResult:
        tool = self.get(identifier, version)
        definition = tool.definition
        if definition.allowed_tenants and context.tenant_id not in definition.allowed_tenants:
            raise ToolExecutionDenied("Tool is not available for this tenant")
        if not context.is_admin and not definition.required_permissions.issubset(
            context.permissions
        ):
            raise ToolExecutionDenied("Tool permission denied")
        validated_input = TypeAdapter(tool.input_model).validate_python(parameters)
        parameters_hash = immutable_action_hash(
            tool_identifier=identifier,
            tool_version=definition.version,
            parameters=validated_input.model_dump(mode="json"),
            tenant_id=context.tenant_id,
            run_id=context.run_id,
        )
        if (
            definition.approval_requirement != ApprovalRequirement.NEVER
            and parameters_hash not in context.approved_action_hashes
        ):
            raise ToolApprovalRequired(
                ToolApprovalRequest(
                    tool_identifier=identifier,
                    tool_version=definition.version,
                    parameters_hash=parameters_hash,
                    tenant_id=context.tenant_id,
                    run_id=context.run_id,
                    expires_at="pending",
                )
            )
        key = idempotency_key or parameters_hash
        output = await tool.handler(validated_input, context)
        validated_output = TypeAdapter(tool.output_model).validate_python(output)
        return ToolExecutionResult(
            tool_identifier=identifier,
            tool_version=definition.version,
            output=validated_output.model_dump(mode="json"),
            idempotency_key=key,
            audit_metadata={
                "side_effect": definition.side_effect.value,
                "audit_policy": definition.audit_policy.value,
                "parameters_hash": parameters_hash,
            },
        )


def immutable_action_hash(
    *,
    tool_identifier: str,
    tool_version: int,
    parameters: dict[str, Any],
    tenant_id: str,
    run_id: str,
) -> str:
    payload = {
        "tool_identifier": tool_identifier,
        "tool_version": tool_version,
        "parameters": parameters,
        "tenant_id": tenant_id,
        "run_id": run_id,
    }
    return hashlib.sha256(
        json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()


@dataclass(slots=True)
class AgentRunState:
    run_id: str
    status: str = "running"
    step: int = 0
    tool_calls: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    estimated_cost_micros: int = 0
    messages: list[dict[str, Any]] = field(default_factory=list)
    last_error: str | None = None
    approval: ToolApprovalRequest | None = None
    pending_tool_call: dict[str, Any] | None = None
    output_text: str | None = None
    output_json: dict[str, Any] | None = None

    @property
    def total_tokens(self) -> int:
        return self.input_tokens + self.output_tokens
