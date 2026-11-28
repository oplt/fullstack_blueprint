from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import RedirectResponse

from backend.core.config import settings
from backend.core.db.dependencies import get_db
from backend.core.storage import ObjectStorageError, StorageNotConfiguredError, object_storage
from backend.modules.identity.dependencies import get_current_user
from backend.modules.identity.models import User
from backend.modules.identity.profile import ProfileService
from backend.modules.identity.profile_schemas import ProfileResponse, ProfileUpdate
from backend.modules.identity.profile_serializers import profile_to_response

router = APIRouter()

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


@router.get("", response_model=ProfileResponse)
async def get_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProfileService(db)
    return await service.get_profile_response(current_user.id)


@router.put("", response_model=ProfileResponse)
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


@router.post("/avatar", response_model=ProfileResponse)
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


@router.get("/avatar/content", include_in_schema=False)
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


@router.delete("/avatar", status_code=204)
async def delete_avatar(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProfileService(db)
    previous_key = await service.clear_avatar(current_user.id)
    await object_storage.delete_object(previous_key)
