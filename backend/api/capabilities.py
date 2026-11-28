from importlib import import_module

from fastapi import APIRouter

from backend.core.config import Settings
from backend.modules.capabilities import CAPABILITY_REGISTRY


def include_registered_router(
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
