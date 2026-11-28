from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.db.dependencies import get_db
from backend.core.pagination import (
    PaginatedResponse,
    PaginationParams,
    paginated_response,
    pagination_params,
)
from backend.modules.admin.platform.schemas import (
    ApiKeyCreateRequest,
    ApiKeyCreateResponse,
    ApiKeyResponse,
    ApiKeyRotateRequest,
)
from backend.modules.identity.dependencies import get_current_user
from backend.modules.identity.models import User
from backend.modules.integrations.api_keys import ApiKeyService

router = APIRouter()


def _api_key_to_response(api_key) -> ApiKeyResponse:
    return ApiKeyResponse(
        id=api_key.id,
        name=api_key.name,
        key_prefix=api_key.key_prefix,
        last_used_at=api_key.last_used_at,
        revoked_at=api_key.revoked_at,
        scopes=list(api_key.scopes_json or []),
        expires_at=api_key.expires_at,
        rate_limit_per_minute=api_key.rate_limit_per_minute,
        created_at=api_key.created_at,
    )


@router.get("/api-keys", response_model=PaginatedResponse[ApiKeyResponse])
async def list_api_keys(
    pagination: PaginationParams = Depends(pagination_params),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ApiKeyService(db)
    keys, total = await service.list_api_keys_for_user(
        current_user,
        limit=pagination.limit,
        offset=pagination.offset,
    )
    return paginated_response(
        [_api_key_to_response(item) for item in keys],
        total=total,
        limit=pagination.limit,
        offset=pagination.offset,
    )


@router.post("/api-keys", response_model=ApiKeyCreateResponse, status_code=201)
async def create_api_key(
    payload: ApiKeyCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ApiKeyService(db)
    api_key, plaintext_key = await service.create_api_key_for_user(
        current_user,
        payload.name,
        scopes=payload.scopes,
        expires_at=payload.expires_at,
        rate_limit_per_minute=payload.rate_limit_per_minute,
    )
    response = _api_key_to_response(api_key)
    return ApiKeyCreateResponse(**response.model_dump(), plaintext_key=plaintext_key)


@router.delete("/api-keys/{api_key_id}", response_model=ApiKeyResponse)
async def revoke_api_key(
    api_key_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ApiKeyService(db)
    api_key = await service.revoke_api_key_for_user(current_user, api_key_id)
    return _api_key_to_response(api_key)


@router.post("/api-keys/{api_key_id}/rotate", response_model=ApiKeyCreateResponse)
async def rotate_api_key(
    api_key_id: str,
    payload: ApiKeyRotateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ApiKeyService(db)
    api_key, plaintext_key = await service.rotate_api_key_for_user(
        current_user,
        api_key_id,
        expires_at=payload.expires_at,
        rate_limit_per_minute=payload.rate_limit_per_minute,
    )
    return ApiKeyCreateResponse(
        **_api_key_to_response(api_key).model_dump(), plaintext_key=plaintext_key
    )
