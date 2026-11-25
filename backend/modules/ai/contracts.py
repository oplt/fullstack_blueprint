"""Application-owned contracts for model providers and AI orchestration.

The rest of the application depends on these types rather than on a provider
SDK.  Provider adapters translate to and from these contracts at the edge.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import UTC, datetime
from enum import StrEnum
from typing import Any, Protocol
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter


class AiCapability(StrEnum):
    TEXT = "text"
    STRUCTURED_OUTPUT = "structured_output"
    STREAMING = "streaming"
    TOOL_CALLING = "tool_calling"
    EMBEDDINGS = "embeddings"
    MULTIMODAL = "multimodal"
    IMAGE = "image"
    AUDIO = "audio"
    REASONING = "reasoning"


class AiTaskType(StrEnum):
    GENERATION = "generation"
    STRUCTURED = "structured"
    EMBEDDING = "embedding"
    TOOL_USE = "tool_use"
    MULTIMODAL = "multimodal"
    REASONING = "reasoning"


class AiMessageRole(StrEnum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"


class AiTextPart(BaseModel):
    kind: str = "text"
    text: str


class AiImagePart(BaseModel):
    kind: str = "image"
    url: str | None = None
    data_base64: str | None = None
    media_type: str = "image/*"


class AiAudioPart(BaseModel):
    kind: str = "audio"
    url: str | None = None
    data_base64: str | None = None
    media_type: str = "audio/*"


AiMessagePart = AiTextPart | AiImagePart | AiAudioPart


class AiMessage(BaseModel):
    role: AiMessageRole
    content: str | list[AiMessagePart]
    name: str | None = None
    tool_call_id: str | None = None


class AiToolDefinition(BaseModel):
    name: str = Field(min_length=1, max_length=128, pattern=r"^[a-zA-Z0-9_.-]+$")
    description: str = ""
    parameters: dict[str, Any] = Field(default_factory=dict)


class AiToolCall(BaseModel):
    id: str = Field(default_factory=lambda: f"call_{uuid4().hex}")
    name: str
    arguments: dict[str, Any] = Field(default_factory=dict)


class AiToolResult(BaseModel):
    tool_call_id: str
    output: Any
    is_error: bool = False


class AiUsage(BaseModel):
    input_tokens: int = Field(default=0, ge=0)
    output_tokens: int = Field(default=0, ge=0)
    cached_input_tokens: int = Field(default=0, ge=0)
    requests: int = Field(default=1, ge=0)

    @property
    def total_tokens(self) -> int:
        return self.input_tokens + self.output_tokens


class AiProviderRequest(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    model: str
    messages: list[AiMessage]
    response_format: str = "text"
    structured_schema: dict[str, Any] | None = None
    tools: list[AiToolDefinition] = Field(default_factory=list)
    temperature: float = Field(default=0.2, ge=0, le=2)
    max_output_tokens: int | None = Field(default=None, ge=1)
    metadata: dict[str, str] = Field(default_factory=dict)
    provider_request_id: str = Field(default_factory=lambda: str(uuid4()))
    timeout_seconds: float | None = Field(default=None, gt=0)
    cancellation_event: Any | None = None

    @property
    def system_prompt(self) -> str:
        return "\n\n".join(
            message.content
            for message in self.messages
            if message.role == AiMessageRole.SYSTEM and isinstance(message.content, str)
        )

    @property
    def user_prompt(self) -> str:
        return "\n\n".join(
            message.content
            for message in self.messages
            if message.role == AiMessageRole.USER and isinstance(message.content, str)
        )


class AiProviderResponse(BaseModel):
    provider_key: str
    model: str
    output_text: str = ""
    output_json: dict[str, Any] | None = None
    tool_calls: list[AiToolCall] = Field(default_factory=list)
    usage: AiUsage = Field(default_factory=AiUsage)
    provider_request_id: str | None = None
    finish_reason: str | None = None
    raw_metadata: dict[str, Any] = Field(default_factory=dict)


class AiStreamEventBase(BaseModel):
    protocol_version: str = "1"
    run_id: str
    sequence: int = Field(ge=0)
    occurred_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class AiRunStartedEvent(AiStreamEventBase):
    type: str = "run.started"
    provider_key: str
    model: str


class AiTextDeltaEvent(AiStreamEventBase):
    type: str = "text.delta"
    delta: str


class AiStructuredOutputEvent(AiStreamEventBase):
    type: str = "structured.output"
    output: dict[str, Any]


class AiToolCallEvent(AiStreamEventBase):
    type: str = "tool.call"
    tool_call: AiToolCall


class AiToolResultEvent(AiStreamEventBase):
    type: str = "tool.result"
    result: AiToolResult


class AiArtifactEvent(AiStreamEventBase):
    type: str = "artifact"
    artifact_id: str
    artifact_type: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class AiUsageEvent(AiStreamEventBase):
    type: str = "usage"
    usage: AiUsage


class AiApprovalEvent(AiStreamEventBase):
    type: str = "approval.required"
    approval_id: str
    reason: str


class AiHeartbeatEvent(AiStreamEventBase):
    type: str = "heartbeat"


class AiRunCompletedEvent(AiStreamEventBase):
    type: str = "run.completed"
    response: AiProviderResponse


class AiRunFailedEvent(AiStreamEventBase):
    type: str = "run.failed"
    error_type: str
    message: str
    provider_request_id: str | None = None


class AiRunCancelledEvent(AiStreamEventBase):
    type: str = "run.cancelled"
    reason: str = "client_disconnected"


AiStreamEvent = (
    AiRunStartedEvent
    | AiTextDeltaEvent
    | AiStructuredOutputEvent
    | AiToolCallEvent
    | AiToolResultEvent
    | AiArtifactEvent
    | AiUsageEvent
    | AiApprovalEvent
    | AiHeartbeatEvent
    | AiRunCompletedEvent
    | AiRunFailedEvent
    | AiRunCancelledEvent
)
AiStreamEventAdapter = TypeAdapter(AiStreamEvent)


class AiProviderPort(Protocol):
    key: str

    async def generate_contract(self, request: AiProviderRequest) -> AiProviderResponse: ...

    def stream(self, request: AiProviderRequest) -> AsyncIterator[AiStreamEvent]: ...

    async def embed_texts(
        self, texts: list[str], *, model: str | None = None
    ) -> list[list[float]]: ...
