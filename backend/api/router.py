from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.capabilities import include_registered_router
from backend.core.config import Settings, settings
from backend.core.db.dependencies import get_db
from backend.modules.identity.auth_routes import router as auth_router
from backend.modules.identity.router import profile_router, users_router
from backend.modules.platform.config_routes import metadata_router as platform_metadata_router
from backend.modules.platform.service import PlatformConfigService


async def require_ai_module(db: AsyncSession = Depends(get_db)) -> None:
    await PlatformConfigService(db).ensure_module_enabled("ai")


def build_api_router(capability_settings: Settings = settings) -> APIRouter:
    router = APIRouter(prefix="/api/v1")
    router.include_router(auth_router, prefix="/auth", tags=["auth"])
    router.include_router(platform_metadata_router, prefix="/platform", tags=["platform"])
    include_registered_router(
        router,
        "ai",
        capability_settings=capability_settings,
        prefix="/ai",
        tag="ai",
        dependencies=[Depends(require_ai_module)],
    )
    include_registered_router(
        router,
        "agents",
        capability_settings=capability_settings,
        prefix="/agent",
        tag="agent",
        dependencies=[Depends(require_ai_module)],
    )
    for identifier, prefix, tag in (
        ("memory", "/memory", "memory"),
        ("rag", "/rag", "rag"),
        ("calendar", "/calendar", "calendar"),
        ("organizations", "/organizations", "organizations"),
        ("projects", "/projects", "projects"),
        ("notifications", "/notifications", "notifications"),
        ("observability", "/observability", "observability"),
        ("platform", "/platform", "platform"),
        ("settings_api", "/settings", "settings"),
        ("admin_api", "/admin", "admin"),
    ):
        include_registered_router(
            router,
            identifier,
            capability_settings=capability_settings,
            prefix=prefix,
            tag=tag,
        )
    router.include_router(users_router, prefix="/users", tags=["users"])
    router.include_router(profile_router, prefix="/profile", tags=["profile"])
    return router


api_router = build_api_router()
