"""Generated environment defaults for resolved blueprint capabilities."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from backend.blueprint.schema import BlueprintConfig


def environment_for(config: BlueprintConfig, capabilities: set[str]) -> dict[str, str]:
    values = {
        "ADMIN_API_ENABLED": str("admin_api" in capabilities).lower(),
        "ACCESS_TOKEN_EXPIRE_MINUTES": "15",
        "AI_ENABLED": str("ai" in capabilities).lower(),
        "AI_MCP_ENABLED": str("agents" in capabilities).lower(),
        "ALLOWED_HOSTS": "localhost,127.0.0.1",
        "ANALYTICS_ENABLED": str("reusable_capabilities" in capabilities).lower(),
        "APP_NAME": config.project.name,
        "BLUEPRINT_PROFILE": config.profile,
        "CALENDAR_ENABLED": str("calendar" in capabilities).lower(),
        "CELERY_TASK_ALWAYS_EAGER": str(config.backend.task_queue == "none").lower(),
        "CORS_ALLOWED_ORIGINS": "http://localhost:5173",
        "DATABASE_URL": "postgresql+asyncpg://app:change-me@localhost:5432/app",
        "INTEGRATIONS_ENABLED": str("reusable_capabilities" in capabilities).lower(),
        "JWT_ALGORITHM": "HS256",
        "JWT_SECRET": "replace-in-local-secret-storage",
        "MEMORY_ENABLED": str("memory" in capabilities).lower(),
        "MEM0_MODE": "oss" if "memory" in capabilities else "hosted",
        "OBSERVABILITY_ENABLED": str(config.deployment.observability == "standard").lower(),
        "ORGANIZATIONS_ENABLED": str("organizations" in capabilities).lower(),
        "PLATFORM_API_ENABLED": str("platform" in capabilities).lower(),
        "PROJECTS_ENABLED": str("projects" in capabilities).lower(),
        "RAG_ENABLED": str("rag" in capabilities).lower(),
        "REDIS_URL": "redis://localhost:6379/0",
        "REFRESH_TOKEN_EXPIRE_DAYS": "7",
        "NOTIFICATIONS_ENABLED": str("notifications" in capabilities).lower(),
        "SETTINGS_API_ENABLED": str("settings_api" in capabilities).lower(),
    }
    return dict(sorted(values.items()))
