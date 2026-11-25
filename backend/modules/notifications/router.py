from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.deps.auth import get_current_user
from backend.api.deps.db import get_db
from backend.core.pagination import (
    PaginatedResponse,
    PaginationParams,
    paginated_response,
    pagination_params,
)
from backend.modules.identity_access.models import User
from backend.modules.notifications.schemas import (
    NotificationPreferenceResponse,
    NotificationPreferenceUpdate,
    NotificationResponse,
)
from backend.modules.notifications.service import NotificationsService

router = APIRouter()


@router.get("", response_model=PaginatedResponse[NotificationResponse])
async def list_notifications(
    pagination: PaginationParams = Depends(pagination_params),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = NotificationsService(db)
    items, total = await service.list_for_user(
        current_user.id,
        limit=pagination.limit,
        offset=pagination.offset,
    )
    return paginated_response(
        [
            NotificationResponse(
                id=n.id,
                type=n.type,
                title=n.title,
                body=n.body,
                is_read=n.is_read,
                created_at=n.created_at,
            )
            for n in items
        ],
        total=total,
        limit=pagination.limit,
        offset=pagination.offset,
    )


@router.patch("/{notification_id}/read", status_code=204)
async def mark_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await NotificationsService(db).mark_read(current_user.id, notification_id)


@router.patch("/read-all", status_code=204)
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await NotificationsService(db).mark_all_read(current_user.id)


@router.get("/preferences", response_model=NotificationPreferenceResponse)
async def get_preferences(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prefs = await NotificationsService(db).get_preferences(current_user.id)
    return NotificationPreferenceResponse(
        email_enabled=prefs.email_enabled,
        push_enabled=prefs.push_enabled,
        marketing_enabled=prefs.marketing_enabled,
        locale=prefs.locale,
    )


@router.put("/preferences", response_model=NotificationPreferenceResponse)
async def update_preferences(
    payload: NotificationPreferenceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prefs = await NotificationsService(db).update_preferences(
        current_user.id,
        email_enabled=payload.email_enabled,
        push_enabled=payload.push_enabled,
        marketing_enabled=payload.marketing_enabled,
        locale=payload.locale,
    )
    return NotificationPreferenceResponse(
        email_enabled=prefs.email_enabled,
        push_enabled=prefs.push_enabled,
        marketing_enabled=prefs.marketing_enabled,
        locale=prefs.locale,
    )
