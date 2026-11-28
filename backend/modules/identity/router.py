from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import RedirectResponse

from backend.core.audit import log_request_audit_event
from backend.core.config import settings
from backend.core.db.dependencies import get_db
from backend.core.pagination import (
    PaginatedResponse,
    PaginationParams,
    paginated_response,
    pagination_params,
)
from backend.core.storage import ObjectStorageError, StorageNotConfiguredError, object_storage
from backend.modules.identity.dependencies import get_current_user
from backend.modules.identity.models import User
from backend.modules.identity.schemas import (
    PasswordChangeRequest,
    ProfileResponse,
    ProfileUpdate,
    SessionResponse,
    UserDirectoryResponse,
    UserProfileResponse,
    UserProfileUpdate,
    profile_to_response,
)
from backend.modules.identity.service import ProfileService, UsersService

users_router = APIRouter()
profile_router = APIRouter()

_AVATAR_FORMATS = {
    "image/jpeg": (".jpg", lambda payload: payload.startswith(b"\xff\xd8\xff")),
    "image/png": (".png", lambda payload: payload.startswith(b"\x89PNG\r\n\x1a\n")),
    "image/gif": (".gif", lambda payload: payload.startswith((b"GIF87a", b"GIF89a"))),
    "image/webp": (
        ".webp",
        lambda payload: payload[:4] == b"RIFF" and payload[8:12] == b"WEBP",
    ),
}


def _build_avatar_object_key(user_id: str, content_type: str) -> str:
    suffix = _AVATAR_FORMATS[content_type][0]
    return f"avatars/{user_id}/{uuid4().hex}{suffix}"


async def _read_avatar_payload(
    file: UploadFile, content_type: str | None, *, max_bytes: int
) -> bytes:
    avatar_format = _AVATAR_FORMATS.get(content_type or "")
    if avatar_format is None:
        raise HTTPException(
            status_code=400, detail="Avatar upload requires a supported raster image"
        )

    payload = await file.read(max_bytes + 1)
    if not payload:
        raise HTTPException(status_code=400, detail="Uploaded avatar file is empty")
    if len(payload) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Avatar exceeds the maximum size of {max_bytes} bytes",
        )
    if not avatar_format[1](payload):
        raise HTTPException(status_code=400, detail="Avatar content does not match its image type")
    return payload


@users_router.get("/me", response_model=UserProfileResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserProfileResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        is_verified=current_user.is_verified,
        mfa_enabled=current_user.mfa_enabled,
    )


@users_router.get("/directory", response_model=PaginatedResponse[UserDirectoryResponse])
async def list_directory(
    pagination: PaginationParams = Depends(pagination_params),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    service = UsersService(db)
    users, total = await service.list_directory(limit=pagination.limit, offset=pagination.offset)
    return paginated_response(users, total=total, limit=pagination.limit, offset=pagination.offset)


@users_router.patch("/me", response_model=UserProfileResponse)
async def update_me(
    payload: UserProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = UsersService(db)
    updated = await service.update_profile(current_user, payload.full_name)
    return UserProfileResponse(
        id=updated.id,
        email=updated.email,
        full_name=updated.full_name,
        is_verified=updated.is_verified,
        mfa_enabled=updated.mfa_enabled,
    )


@users_router.patch("/me/password", status_code=204)
async def change_password(
    payload: PasswordChangeRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = UsersService(db)
    await service.change_password(current_user, payload.current_password, payload.new_password)
    await log_request_audit_event(
        db,
        request,
        action="user.password_changed",
        actor_user_id=current_user.id,
        resource_type="user",
        resource_id=current_user.id,
    )
    await service.save()


@users_router.get("/me/sessions", response_model=list[SessionResponse])
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = UsersService(db)
    sessions = await service.list_sessions(current_user)
    return [
        SessionResponse(id=s.id, created_at=s.created_at, expires_at=s.expires_at) for s in sessions
    ]


@users_router.delete("/me/sessions/{session_id}", status_code=204)
async def revoke_session(
    session_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = UsersService(db)
    await service.revoke_session(current_user, session_id)
    await log_request_audit_event(
        db,
        request,
        action="user.session_revoked",
        actor_user_id=current_user.id,
        resource_type="refresh_session",
        resource_id=session_id,
    )
    await service.save()


@profile_router.get("", response_model=ProfileResponse)
async def get_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProfileService(db)
    return await service.get_profile_response(current_user.id)


@profile_router.put("", response_model=ProfileResponse)
async def update_profile(
    payload: ProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProfileService(db)
    profile = await service.update_profile(
        current_user.id, payload.bio, payload.location, payload.website
    )
    return profile_to_response(profile)


@profile_router.post("/avatar", response_model=ProfileResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content_type = file.content_type or ""
    payload = await _read_avatar_payload(
        file,
        content_type,
        max_bytes=settings.STORAGE_AVATAR_MAX_BYTES,
    )

    object_key = _build_avatar_object_key(current_user.id, content_type)
    try:
        avatar_url = await object_storage.upload_bytes(
            object_key=object_key,
            body=payload,
            content_type=content_type,
        )
    except StorageNotConfiguredError:
        raise HTTPException(status_code=503, detail="Avatar storage is unavailable") from None
    except ObjectStorageError:
        raise HTTPException(status_code=502, detail="Avatar upload failed") from None

    service = ProfileService(db)
    try:
        profile, previous_key = await service.replace_avatar(
            current_user.id,
            avatar_url=avatar_url,
            storage_key=object_key,
        )
    except Exception:
        await object_storage.delete_object(object_key)
        raise

    if previous_key and previous_key != object_key:
        await object_storage.delete_object(previous_key)
    return profile_to_response(profile)


@profile_router.get("/avatar/content", include_in_schema=False)
async def get_avatar_content(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = await ProfileService(db).get_profile(current_user.id)
    if not profile.avatar_storage_key:
        raise HTTPException(status_code=404, detail="Avatar not found")
    try:
        url = await object_storage.presigned_download_url(profile.avatar_storage_key)
    except StorageNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ObjectStorageError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return RedirectResponse(url, status_code=307)


@profile_router.delete("/avatar", status_code=204)
async def delete_avatar(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProfileService(db)
    previous_key = await service.clear_avatar(current_user.id)
    await object_storage.delete_object(previous_key)
