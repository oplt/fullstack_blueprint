from importlib import import_module

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import Settings, settings
from backend.core.db.dependencies import get_db
from backend.modules.admin.config_routes import metadata_router as platform_metadata_router
from backend.modules.admin.platform_configuration import PlatformConfigService
from backend.modules.capabilities import CAPABILITY_REGISTRY
from backend.modules.identity.auth_routes import router as auth_router
from backend.modules.identity.profile_routes import router as profile_router
from backend.modules.identity.user_routes import router as users_router


async def require_ai_module(db: AsyncSession = Depends(get_db)) -> None:
    await PlatformConfigService(db).ensure_module_enabled("ai")


def _include_registered_router(
    target: APIRouter,
    identifier: str,
    *,
    capability_settings: Settings,
    prefix: str,
    tag: str,
    dependencies: list | None = None,
) -> None:
    definition = CAPABILITY_REGISTRY.get(identifier)
    if not definition.router or not CAPABILITY_REGISTRY.deployment_enabled(
        identifier, capability_settings
    ):
        return
    module_path, attribute = definition.router.split(":", maxsplit=1)
    router = getattr(import_module(module_path), attribute)
    target.include_router(router, prefix=prefix, tags=[tag], dependencies=dependencies or [])


def build_api_router(capability_settings: Settings = settings) -> APIRouter:
    router = APIRouter(prefix="/api/v1")
    router.include_router(auth_router, prefix="/auth", tags=["auth"])
    router.include_router(platform_metadata_router, prefix="/platform", tags=["platform"])
    _include_registered_router(
        router,
        "ai",
        capability_settings=capability_settings,
        prefix="/ai",
        tag="ai",
        dependencies=[Depends(require_ai_module)],
    )
    _include_registered_router(
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
        _include_registered_router(
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
