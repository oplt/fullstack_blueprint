from __future__ import annotations
from sqlalchemy.ext.asyncio import AsyncSession
from backend.modules.ai.gateway import AiModelGateway
from backend.modules.ai.repository import AiRepository
from typing import Any
from pydantic import BaseModel
from backend.core.config import settings
from backend.modules.ai.contracts import AiProviderRequest, AiProviderResponse, AiUsage
from backend.modules.ai.errors import AiErrorKind, AiProviderError


class AiBaseService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = AiRepository(db)
        self.gateway = AiModelGateway()

    @property
    def providers(self):
        """Compatibility view for callers that inject a provider registry."""

        return self.gateway.providers

    @providers.setter
    def providers(self, value):
        self.gateway = AiModelGateway(providers=value, models=self.gateway.models)


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
            from pydantic_ai import Agent  # type: ignore[reportMissingImports]  # noqa: PLC0415 - optional ai extra
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
