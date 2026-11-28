from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.db.dependencies import get_db
from backend.modules.identity.dependencies import get_current_user
from backend.modules.identity.models import User
from backend.modules.identity.organizations.schemas import (
    OrganizationCreate,
    OrganizationMemberCreate,
    OrganizationMemberResponse,
    OrganizationResponse,
)
from backend.modules.identity.organizations.service import OrganizationsService

router = APIRouter()


@router.get("", response_model=list[OrganizationResponse])
async def list_organizations(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return await OrganizationsService(db).list_for_user(current_user.id)


@router.post("", response_model=OrganizationResponse, status_code=201)
async def create_organization(
    payload: OrganizationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await OrganizationsService(db).create(
        owner_id=current_user.id, name=payload.name, slug=payload.slug
    )


@router.get("/{organization_id}", response_model=OrganizationResponse)
async def get_organization(
    organization_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await OrganizationsService(db).get_for_user(organization_id, current_user.id)


@router.get("/{organization_id}/members", response_model=list[OrganizationMemberResponse])
async def list_members(
    organization_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await OrganizationsService(db).list_members(organization_id, current_user.id)


@router.post(
    "/{organization_id}/members",
    response_model=OrganizationMemberResponse,
    status_code=201,
)
async def add_member(
    organization_id: str,
    payload: OrganizationMemberCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await OrganizationsService(db).add_member(organization_id, current_user.id, payload)
