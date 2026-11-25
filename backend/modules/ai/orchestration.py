"""Optional Pydantic AI integration kept behind application-owned contracts.

Pydantic AI is used for typed structured-output orchestration only. Raw
provider adapters remain responsible for Responses/Chat Completions,
Anthropic streaming, compatible servers, multimodal payloads and embeddings.
This keeps framework-specific objects out of domain services while retaining a
small, testable upgrade path for typed agents.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel

from backend.core.config import settings
from backend.modules.ai.contracts import AiProviderRequest, AiProviderResponse, AiUsage
from backend.modules.ai.errors import AiErrorKind, AiProviderError


class PydanticAiOrchestrator:
    """Run a typed result through Pydantic AI without leaking its types."""

    @staticmethod
    async def run(
        request: AiProviderRequest,
        *,
        output_type: type[BaseModel],
    ) -> AiProviderResponse:
        if settings.AI_ORCHESTRATOR != "pydantic_ai":
            raise AiProviderError(
                "Pydantic AI orchestration is disabled",
                kind=AiErrorKind.CONFIGURATION,
                provider_key="pydantic_ai",
            )
        if request.metadata.get("provider_key") not in {"openai", "anthropic"}:
            raise AiProviderError(
                "Pydantic AI orchestration supports configured hosted providers only",
                kind=AiErrorKind.INVALID_REQUEST,
                provider_key=request.metadata.get("provider_key", "unknown"),
            )
        try:
            from pydantic_ai import Agent  # type: ignore[reportMissingImports]
        except ImportError as exc:  # pragma: no cover - dependency is installed in supported builds
            raise AiProviderError(
                "Install the ai dependency extra to enable Pydantic AI orchestration",
                kind=AiErrorKind.CONFIGURATION,
                provider_key="pydantic_ai",
            ) from exc

        provider_key = request.metadata["provider_key"]
        try:
            agent = Agent(
                f"{provider_key}:{request.model}",
                output_type=output_type,
                instructions=request.system_prompt,
            )
            result = await agent.run(
                request.user_prompt,
                model_settings={"temperature": request.temperature},
                metadata=request.metadata,
            )
            usage_result = getattr(result, "usage", None)
            usage_data: dict[str, Any] = {}
            if callable(usage_result):
                usage = usage_result()
                usage_data = {
                    "input_tokens": getattr(usage, "input_tokens", 0),
                    "output_tokens": getattr(usage, "output_tokens", 0),
                }
            output = result.output
            output_json = output.model_dump(mode="json")
            return AiProviderResponse(
                provider_key=provider_key,
                model=request.model,
                output_text=output.model_dump_json(),
                output_json=output_json,
                usage=AiUsage(**usage_data),
                provider_request_id=request.provider_request_id,
            )
        except AiProviderError:
            raise
        except Exception as exc:
            raise AiProviderError(
                "Typed AI orchestration failed",
                kind=AiErrorKind.PROVIDER,
                provider_key=provider_key,
                retryable=False,
            ) from exc
