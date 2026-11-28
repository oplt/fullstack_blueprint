from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.db.dependencies import get_db
from backend.modules.admin import config_routes as config_router
from backend.modules.admin import feature_routes as feature_flag_router
from backend.modules.admin.billing import router as billing_router
from backend.modules.admin.billing.entitlements import EntitlementService
from backend.modules.admin.platform.schemas import EntitlementResponse
from backend.modules.admin.platform_configuration import PlatformConfigService
from backend.modules.identity.dependencies import get_current_user
from backend.modules.identity.models import User
from backend.modules.integrations import api_key_routes as api_key_router
from backend.modules.integrations import webhook_routes as webhook_router
from backend.modules.notifications import template_routes as email_template_router

router = APIRouter()
router.include_router(config_router.router)
router.include_router(billing_router.router)
router.include_router(api_key_router.router)
router.include_router(webhook_router.router)
router.include_router(feature_flag_router.router)
router.include_router(email_template_router.router)


@router.get("/entitlements/{entitlement_key}", response_model=EntitlementResponse)
async def get_entitlement(
    entitlement_key: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await PlatformConfigService(db).ensure_module_enabled("billing")
    enabled = await EntitlementService(db).evaluate(current_user, entitlement_key)
    return EntitlementResponse(key=entitlement_key, enabled=enabled)
