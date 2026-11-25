from __future__ import annotations

from backend.modules.ai.base_service import AiBaseService
from backend.modules.ai.providers import AiProviderRegistry
from backend.modules.ai.schemas import AiProviderDescriptor


class AiProviderService(AiBaseService):
    @staticmethod
    def list_provider_descriptors() -> list[AiProviderDescriptor]:
        return [
            AiProviderDescriptor(**descriptor) for descriptor in AiProviderRegistry().descriptors()
        ]
