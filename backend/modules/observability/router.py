from fastapi import APIRouter, Depends

from backend.core.config import settings
from backend.core.observability.schemas import ObservabilityLinks, ObservabilityStatus
from backend.core.observability.service import ObservabilityService
from backend.modules.identity.dependencies import get_current_user
from backend.modules.identity.models import User

router = APIRouter()


@router.get("/links", response_model=ObservabilityLinks)
async def get_links(current_user: User = Depends(get_current_user)) -> ObservabilityLinks:
    return ObservabilityService(settings).get_links(is_admin=current_user.is_admin)


@router.get("/status", response_model=ObservabilityStatus)
async def get_status(_: User = Depends(get_current_user)) -> ObservabilityStatus:
    return await ObservabilityService(settings).get_status()
