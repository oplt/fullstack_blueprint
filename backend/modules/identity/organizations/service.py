from typing import cast

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.organizations.models import Organization
from backend.modules.organizations.repository import OrganizationsRepository
from backend.modules.organizations.schemas import (
    OrganizationMemberCreate,
    OrganizationMemberResponse,
    OrganizationResponse,
    OrganizationRole,
)


class OrganizationsService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = OrganizationsRepository(db)

    async def create(self, *, owner_id: str, name: str, slug: str) -> Organization:
        organization = await self.repo.create(owner_id=owner_id, name=name, slug=slug)
        await self.repo.add_member(organization_id=organization.id, user_id=owner_id, role="owner")
        try:
            await self.db.commit()
        except IntegrityError as exc:
            await self.db.rollback()
            raise HTTPException(status_code=409, detail="Organization slug already exists") from exc
        await self.db.refresh(organization)
        return organization

    async def list_for_user(self, user_id: str) -> list[OrganizationResponse]:
        return [
            self._organization_response(item) for item in await self.repo.list_for_user(user_id)
        ]

    async def get_for_user(self, organization_id: str, user_id: str) -> OrganizationResponse:
        organization = await self._get_for_user(organization_id, user_id)
        return self._organization_response(organization)

    async def list_members(
        self, organization_id: str, user_id: str
    ) -> list[OrganizationMemberResponse]:
        await self._get_for_user(organization_id, user_id)
        return [
            OrganizationMemberResponse(
                user_id=member_user.id,
                email=member_user.email,
                full_name=member_user.full_name,
                role=cast(OrganizationRole, member.role),
            )
            for member, member_user in await self.repo.list_members(organization_id)
        ]

    async def add_member(
        self, organization_id: str, actor_id: str, payload: OrganizationMemberCreate
    ) -> OrganizationMemberResponse:
        await self._get_admin_or_owner(organization_id, actor_id)
        user = await self.repo.get_user(payload.user_id)
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")
        existing = await self.repo.get_membership(organization_id, user.id)
        if existing:
            existing.role = payload.role
            member = existing
        else:
            member = await self.repo.add_member(
                organization_id=organization_id, user_id=user.id, role=payload.role
            )
        await self.db.commit()
        return OrganizationMemberResponse(
            user_id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=cast(OrganizationRole, member.role),
        )

    async def _get_for_user(self, organization_id: str, user_id: str) -> Organization:
        organization = await self.repo.get_by_id_for_user(organization_id, user_id)
        if organization is None:
            raise HTTPException(status_code=404, detail="Organization not found")
        return organization

    async def _get_admin_or_owner(self, organization_id: str, user_id: str) -> Organization:
        organization = await self._get_for_user(organization_id, user_id)
        membership = await self.repo.get_membership(organization.id, user_id)
        if membership is None or membership.role not in {"owner", "admin"}:
            raise HTTPException(
                status_code=403, detail="Organization administrator access required"
            )
        return organization

    @staticmethod
    def _organization_response(organization: Organization) -> OrganizationResponse:
        return OrganizationResponse(
            id=organization.id,
            owner_id=organization.owner_id,
            name=organization.name,
            slug=organization.slug,
            created_at=organization.created_at,
        )
