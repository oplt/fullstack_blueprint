from fastapi import APIRouter, Depends

from backend.core.config import settings
from backend.dependencies.auth import get_current_user
from modules.observability.schemas import ObservabilityLinks, ObservabilityStatus
from modules.observability.service import ObservabilityService

router = APIRouter()


@router.get("/links", response_model=ObservabilityLinks)
async def get_observability_links(
    current_user=Depends(get_current_user),
) -> ObservabilityLinks:
    return ObservabilityService(settings).get_links(is_admin=current_user.is_admin)


@router.get("/status", response_model=ObservabilityStatus)
async def get_observability_status(
    _=Depends(get_current_user),
) -> ObservabilityStatus:
    return await ObservabilityService(settings).get_status()
