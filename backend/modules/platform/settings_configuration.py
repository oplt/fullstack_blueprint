from __future__ import annotations

import asyncio
import contextlib
import json
import logging
from collections.abc import Iterable
from typing import Any

from fastapi import HTTPException

from backend.core.cache import (
    SETTINGS_CONFIG_ENTRIES_CACHE_KEY,
    get_local_cached_json,
    invalidate_settings_config_cache,
    set_local_cached_json,
)
from backend.core.config import ENV_FILE, Settings, settings
from backend.modules.platform.configuration import (
    CONFIG_FIELD_METADATA,
    CONFIG_NOTICE,
    DEPRECATED_CONFIG_KEY_REPLACEMENTS,
    REDACTED_SECRET,
    SENSITIVE_KEY_MARKERS,
    TYPE_LABELS,
)
from backend.modules.platform.env_file_store import EnvFileStore
from backend.modules.platform.settings_schemas import (
    ConfigEntryResponse,
    ConfigEntryUpdate,
    ConfigSettingsResponse,
)

logger = logging.getLogger(__name__)


class SettingsConfigService:
    @classmethod
    async def list_config_entries(cls) -> ConfigSettingsResponse:
        cached = get_local_cached_json(SETTINGS_CONFIG_ENTRIES_CACHE_KEY)
        if cached is not None:
            return ConfigSettingsResponse.model_validate(cached)

        response = await asyncio.to_thread(cls._build_config_entries)
        set_local_cached_json(
            SETTINGS_CONFIG_ENTRIES_CACHE_KEY,
            response.model_dump(mode="json"),
            ttl_seconds=settings.CACHE_SETTINGS_TTL_SECONDS,
        )
        return response

    @classmethod
    def _build_config_entries(cls) -> ConfigSettingsResponse:
        env_entries = {
            key: value
            for key, value in cls._read_env_entries().items()
            if key not in DEPRECATED_CONFIG_KEY_REPLACEMENTS
        }
        items: list[ConfigEntryResponse] = []
        known_fields = Settings.model_fields
        ordered_keys = list(env_entries)

        ordered_keys.extend(key for key in known_fields if key not in env_entries)

        for key in ordered_keys:
            if key in env_entries:
                value = env_entries[key]
            elif key in known_fields:
                value = cls._serialize_value(getattr(settings, key))
            else:
                value = ""

            items.append(
                ConfigEntryResponse(
                    key=key,
                    value=REDACTED_SECRET if cls._is_secret_key(key) and value else value,
                    value_type=cls._get_value_type(key),
                    description=CONFIG_FIELD_METADATA.get(key, {}).get("description"),
                    requires_restart=True,
                    is_custom=key not in known_fields,
                    is_secret=cls._is_secret_key(key),
                )
            )

        return ConfigSettingsResponse(items=items, notice=CONFIG_NOTICE)

    @classmethod
    def _collect_config_updates(cls, updates: Iterable[ConfigEntryUpdate]) -> dict[str, str]:
        seen_keys: set[str] = set()
        raw_updates: dict[str, str] = {}

        for item in updates:
            key = item.key
            replacement = DEPRECATED_CONFIG_KEY_REPLACEMENTS.get(key)
            if replacement:
                raise HTTPException(
                    status_code=422,
                    detail=f"Config key {key} is deprecated; use {replacement}",
                )
            if key in seen_keys:
                raise HTTPException(status_code=400, detail=f"Duplicate config key: {key}")
            if key not in Settings.model_fields:
                raise HTTPException(status_code=422, detail=f"Unknown config key: {key}")
            if "\n" in item.value or "\r" in item.value:
                raise HTTPException(status_code=422, detail=f"Invalid value for config key: {key}")
            seen_keys.add(key)
            raw_updates[key] = item.value
        return raw_updates

    @classmethod
    def _update_config_entries_sync(
        cls, updates: Iterable[ConfigEntryUpdate]
    ) -> ConfigSettingsResponse:
        if settings.is_production:
            raise HTTPException(status_code=403, detail="Configuration editing is disabled")
        raw_updates = cls._collect_config_updates(updates)

        def validate_and_normalize(current: dict[str, str]) -> dict[str, str]:
            merged = settings.model_dump()
            merged.update({key: value for key, value in current.items() if key in merged})
            for key, raw_value in raw_updates.items():
                value = raw_value
                if cls._is_secret_key(key) and value == REDACTED_SECRET:
                    value = current.get(key, cls._serialize_value(getattr(settings, key, "")))
                merged[key] = value
            try:
                validated = Settings.model_validate(merged)
            except Exception as exc:
                fields = sorted(
                    {str(error["loc"][-1]) for error in getattr(exc, "errors", lambda: [])()}
                )
                raise HTTPException(
                    status_code=422,
                    detail={"message": "Invalid configuration value", "fields": fields},
                ) from None
            return {
                key: json.dumps(cls._serialize_value(getattr(validated, key)))
                for key in raw_updates
            }

        EnvFileStore(ENV_FILE).update_from_current(
            validate_and_normalize,
            parse_line=cls._parse_env_line,
        )

        invalidate_settings_config_cache()
        logger.info("Environment config updated keys=%s", sorted(raw_updates))
        return cls._build_config_entries()

    @classmethod
    async def update_config_entries(
        cls, updates: Iterable[ConfigEntryUpdate]
    ) -> ConfigSettingsResponse:
        return await asyncio.to_thread(cls._update_config_entries_sync, list(updates))

    @staticmethod
    def _get_value_type(key: str) -> str:
        field = Settings.model_fields.get(key)
        if not field:
            return "string"
        return TYPE_LABELS.get(field.annotation, "string")

    @staticmethod
    def _serialize_value(value: Any) -> str:
        if isinstance(value, bool):
            return "true" if value else "false"
        return str(value)

    @staticmethod
    def _is_secret_key(key: str) -> bool:
        normalized = key.upper()
        return any(marker in normalized for marker in SENSITIVE_KEY_MARKERS)

    @staticmethod
    def _parse_env_line(line: str) -> tuple[str, str] | None:
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in line:
            return None

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if value.startswith('"'):
            with contextlib.suppress(json.JSONDecodeError):
                value = json.loads(value)
        if not key:
            return None
        return key, value

    @classmethod
    def _read_env_entries(cls) -> dict[str, str]:
        if not ENV_FILE.exists():
            return {}

        entries: dict[str, str] = {}
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            parsed = cls._parse_env_line(line)
            if parsed:
                key, value = parsed
                entries[key] = value
        return entries
