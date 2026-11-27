from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.dependencies.auth import get_current_user
from backend.dependencies.db import get_db
from backend.modules.identity_access.models import User
from backend.modules.platform.api_key_routes import router as api_key_router
from backend.modules.platform.billing_routes import router as billing_router
from backend.modules.platform.config_routes import router as config_router
from backend.modules.platform.config_service import PlatformConfigService
from backend.modules.platform.email_template_routes import router as email_template_router
from backend.modules.platform.entitlement_service import EntitlementService
from backend.modules.platform.feature_flag_routes import router as feature_flag_router
from backend.modules.platform.schemas import EntitlementResponse
from backend.modules.platform.webhook_routes import router as webhook_router

router = APIRouter()
router.include_router(config_router)
router.include_router(billing_router)
router.include_router(api_key_router)
router.include_router(webhook_router)
router.include_router(feature_flag_router)
router.include_router(email_template_router)


@router.get("/entitlements/{entitlement_key}", response_model=EntitlementResponse)
async def get_entitlement(
    entitlement_key: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await PlatformConfigService(db).ensure_module_enabled("billing")
    enabled = await EntitlementService(db).evaluate(current_user, entitlement_key)
    return EntitlementResponse(key=entitlement_key, enabled=enabled)
