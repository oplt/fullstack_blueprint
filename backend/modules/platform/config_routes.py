from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.dependencies.admin import get_admin_user
from backend.dependencies.db import get_db
from backend.modules.audit.request_logging import log_request_audit_event
from backend.modules.identity_access.models import User
from backend.modules.platform.config_service import PlatformConfigService
from backend.modules.platform.schemas import (
    PlatformConfigResponse,
    PlatformConfigUpdateRequest,
    PlatformMetadataResponse,
)

metadata_router = APIRouter()
router = APIRouter()


@metadata_router.get("/metadata", response_model=PlatformMetadataResponse)
async def get_platform_metadata(db: AsyncSession = Depends(get_db)):
    service = PlatformConfigService(db)
    return await service.get_platform_metadata()


@router.get("/admin/config", response_model=PlatformConfigResponse)
async def get_platform_config(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    service = PlatformConfigService(db)
    return await service.get_platform_config()


@router.put("/admin/config", response_model=PlatformConfigResponse)
async def update_platform_config(
    payload: PlatformConfigUpdateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    service = PlatformConfigService(db)
    response = await service.update_platform_config(**payload.model_dump())
    await log_request_audit_event(
        db,
        request,
        action="admin.platform_config_updated",
        actor_user_id=admin.id,
        resource_type="platform_config",
    )
    await service.save()
    return response
