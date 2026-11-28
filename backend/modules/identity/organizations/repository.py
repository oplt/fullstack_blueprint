from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.identity.models import User
from backend.modules.identity.organizations.models import Organization, OrganizationMember


class OrganizationsRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, *, owner_id: str, name: str, slug: str) -> Organization:
        organization = Organization(owner_id=owner_id, name=name, slug=slug)
        self.db.add(organization)
        await self.db.flush()
        return organization

    async def add_member(
        self, *, organization_id: str, user_id: str, role: str
    ) -> OrganizationMember:
        member = OrganizationMember(organization_id=organization_id, user_id=user_id, role=role)
        self.db.add(member)
        await self.db.flush()
        return member

    async def get_by_id_for_user(self, organization_id: str, user_id: str) -> Organization | None:
        result = await self.db.execute(
            select(Organization)
            .join(OrganizationMember, OrganizationMember.organization_id == Organization.id)
            .where(Organization.id == organization_id, OrganizationMember.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def list_for_user(self, user_id: str) -> list[Organization]:
        result = await self.db.execute(
            select(Organization)
            .join(OrganizationMember, OrganizationMember.organization_id == Organization.id)
            .where(OrganizationMember.user_id == user_id)
            .order_by(Organization.created_at.asc())
        )
        return list(result.scalars().all())

    async def get_membership(self, organization_id: str, user_id: str) -> OrganizationMember | None:
        result = await self.db.execute(
            select(OrganizationMember).where(
                OrganizationMember.organization_id == organization_id,
                OrganizationMember.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_members(self, organization_id: str) -> list[tuple[OrganizationMember, User]]:
        result = await self.db.execute(
            select(OrganizationMember, User)
            .join(User, User.id == OrganizationMember.user_id)
            .where(OrganizationMember.organization_id == organization_id)
            .order_by(OrganizationMember.created_at.asc())
        )
        return list(result.all())

    async def get_user(self, user_id: str) -> User | None:
        result = await self.db.execute(
            select(User).where(User.id == user_id, User.is_active.is_(True))
        )
        return result.scalar_one_or_none()

    async def delete_member(self, member: OrganizationMember) -> None:
        await self.db.execute(delete(OrganizationMember).where(OrganizationMember.id == member.id))
