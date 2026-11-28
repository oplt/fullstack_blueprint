from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.ai.gateway import AiModelGateway
from backend.modules.ai.repository import AiRepository


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
