"""Built-in safe tools and the extension point for module-owned tools."""

from __future__ import annotations

from pydantic import BaseModel, Field

from backend.modules.agents.contracts import (
    ToolDefinition,
    ToolSideEffect,
    TypedToolRegistry,
)


class EchoInput(BaseModel):
    value: str = Field(max_length=4000)


class EchoOutput(BaseModel):
    value: str


class JoinInput(BaseModel):
    values: list[str] = Field(min_length=1, max_length=64)
    separator: str = Field(default=" ", max_length=16)


class JoinOutput(BaseModel):
    value: str


async def echo_tool(payload: EchoInput, _context):
    return EchoOutput(value=payload.value)


async def join_tool(payload: JoinInput, _context):
    return JoinOutput(value=payload.separator.join(payload.values))


def build_default_tool_registry() -> TypedToolRegistry:
    registry = TypedToolRegistry()
    registry.register(
        ToolDefinition(
            identifier="core.echo",
            version=1,
            description="Return a supplied value without side effects.",
            required_permissions=frozenset({"ai.tool.read"}),
            side_effect=ToolSideEffect.READ_ONLY,
        ),
        input_model=EchoInput,
        output_model=EchoOutput,
        handler=echo_tool,
    )
    registry.register(
        ToolDefinition(
            identifier="core.join",
            version=1,
            description="Join supplied values without side effects.",
            required_permissions=frozenset({"ai.tool.read"}),
            side_effect=ToolSideEffect.READ_ONLY,
        ),
        input_model=JoinInput,
        output_model=JoinOutput,
        handler=join_tool,
    )
    return registry
