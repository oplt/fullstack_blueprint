from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.cache import (
    SETTINGS_DATABASE_CACHE_KEY,
    cache_get_or_load_json,
    invalidate_settings_related_caches,
)
from backend.core.config import settings
from backend.modules.admin.models import AppSetting
from backend.modules.admin.repository import SettingsRepository

logger = logging.getLogger(__name__)


class SettingsService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = SettingsRepository(db)

    async def save(self) -> None:
        """Commit the command transaction owned by this application service."""
        await self.db.commit()

    async def list_database_settings(self) -> list[AppSetting]:
        cached = await cache_get_or_load_json(
            SETTINGS_DATABASE_CACHE_KEY,
            ttl_seconds=settings.CACHE_SETTINGS_TTL_SECONDS,
            loader=self._load_database_settings_for_cache,
        )
        return [self._setting_from_cache(item) for item in cached]

    async def _load_database_settings_for_cache(self) -> list[dict]:
        rows = await self.repo.list_all()
        return [self._setting_to_cache(row) for row in rows]

    async def create_database_setting(
        self, key: str, value: str, description: str | None
    ) -> AppSetting:
        existing = await self.repo.get_by_key(key)
        if existing:
            raise HTTPException(
                status_code=409, detail="A database setting with this key already exists"
            )

        setting = await self.repo.create(key=key, value=value, description=description)
        await self.db.commit()
        await self.db.refresh(setting)
        await invalidate_settings_related_caches(key)
        logger.info("Database setting created key=%s", key)
        return setting

    async def update_database_setting(self, setting_id: str, updates: dict[str, Any]) -> AppSetting:
        setting = await self.repo.get_by_id(setting_id)
        if not setting:
            raise HTTPException(status_code=404, detail="Database setting not found")

        for field, value in updates.items():
            setattr(setting, field, value)

        await self.db.commit()
        await self.db.refresh(setting)
        await invalidate_settings_related_caches(setting.key)
        logger.info("Database setting updated key=%s", setting.key)
        return setting

    async def delete_database_setting(self, setting_id: str) -> None:
        setting = await self.repo.get_by_id(setting_id)
        if not setting:
            raise HTTPException(status_code=404, detail="Database setting not found")

        setting_key = setting.key
        await self.repo.delete(setting)
        await self.db.commit()
        await invalidate_settings_related_caches(setting_key)
        logger.info("Database setting deleted key=%s", setting_key)

    @staticmethod
    def _setting_to_cache(setting: AppSetting) -> dict:
        return {
            "id": setting.id,
            "key": setting.key,
            "value": setting.value,
            "description": setting.description,
            "updated_at": setting.updated_at.isoformat(),
        }

    @staticmethod
    def _setting_from_cache(payload: dict) -> AppSetting:
        data = dict(payload)
        updated_at = data.get("updated_at")
        if isinstance(updated_at, str):
            data["updated_at"] = datetime.fromisoformat(updated_at)
        return AppSetting(**data)
