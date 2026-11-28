from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.db.dependencies import get_db
from backend.modules.admin.dependencies import get_admin_user
from backend.modules.admin.schemas import (
    AdminUserListResponse,
    AdminUserResponse,
    AdminUserStatusUpdate,
    AuditLogResponse,
    MetricsResponse,
)
from backend.modules.admin.service import AdminService
from backend.modules.identity.models import User

router = APIRouter()


def _user_to_response(user: User) -> AdminUserResponse:
    roles = ["user"]
    if user.is_admin:
        roles.append("admin")

    return AdminUserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        roles=roles,
        is_active=user.is_active,
        is_verified=user.is_verified,
        is_admin=user.is_admin,
        mfa_enabled=user.mfa_enabled,
        created_at=user.created_at,
    )


@router.get("/users", response_model=AdminUserListResponse)
async def list_users(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, min_length=1),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    users, total = await AdminService(db).list_users(
        page=page,
        page_size=page_size,
        search=search,
    )

    return AdminUserListResponse(
        items=[_user_to_response(user) for user in users],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/users/{user_id}", response_model=AdminUserResponse)
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    user = await AdminService(db).get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _user_to_response(user)


@router.patch("/users/{user_id}/status", response_model=AdminUserResponse)
async def update_user_status(
    user_id: str,
    payload: AdminUserStatusUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot change your own status")
    user = await AdminService(db).update_user_status(
        user_id=user_id,
        admin_id=admin.id,
        is_active=payload.is_active,
    )
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return _user_to_response(user)


@router.get("/audit-logs", response_model=list[AuditLogResponse])
async def list_audit_logs(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    logs = await AdminService(db).list_audit_logs()
    return [
        AuditLogResponse(
            id=log.id,
            user_id=log.user_id,
            action=log.action,
            resource_type=log.resource_type,
            resource_id=log.resource_id,
            ip_address=log.ip_address,
            created_at=log.created_at,
        )
        for log in logs
    ]


@router.get("/metrics", response_model=MetricsResponse)
async def get_metrics(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    total, verified, active, notifs = await AdminService(db).metrics()

    return MetricsResponse(
        total_users=total,
        verified_users=verified,
        active_users=active,
        total_notifications=notifs,
    )
