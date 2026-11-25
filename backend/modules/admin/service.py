"""Admin application use cases; routers only map requests and responses."""

from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.audit.repository import AuditRepository
from backend.modules.events.domain import DomainEvent
from backend.modules.events.service import OutboxService
from backend.modules.identity_access.models import User
from backend.modules.identity_access.repository import IdentityRepository
from backend.modules.notifications.models import Notification


class AdminService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.identity_repository = IdentityRepository(db)
        self.audit_repository = AuditRepository(db)

    async def list_users(
        self,
        *,
        page: int,
        page_size: int,
        search: str | None,
    ) -> tuple[list[User], int]:
        filters = []
        if search:
            search_term = f"%{search.strip()}%"
            filters.append(or_(User.email.ilike(search_term), User.full_name.ilike(search_term)))
        total_query = select(func.count()).select_from(User)
        data_query = select(User).order_by(User.created_at.desc())
        if filters:
            total_query = total_query.where(*filters)
            data_query = data_query.where(*filters)
        total = int(await self.db.scalar(total_query) or 0)
        result = await self.db.execute(data_query.offset((page - 1) * page_size).limit(page_size))
        return list(result.scalars().all()), total

    async def get_user(self, user_id: str) -> User | None:
        return await self.identity_repository.get_user_by_id(user_id)

    async def update_user_status(
        self,
        *,
        user_id: str,
        admin_id: str,
        is_active: bool,
    ) -> User | None:
        user = await self.get_user(user_id)
        if user is None:
            return None
        user.is_active = is_active
        await self.audit_repository.log(
            action="admin.update_user_status",
            user_id=admin_id,
            resource_type="user",
            resource_id=user.id,
            metadata={"is_active": is_active},
        )
        await OutboxService(self.db).enqueue(
            DomainEvent(
                event_type="admin.user_status_changed.v1",
                aggregate_type="user",
                aggregate_id=user.id,
                producer="admin",
                payload={"is_active": is_active, "actor_user_id": admin_id},
            )
        )
        await self.db.commit()
        return user

    async def list_audit_logs(self):
        return await self.audit_repository.list_recent(limit=100)

    async def metrics(self) -> tuple[int, int, int, int]:
        result = await self.db.execute(
            select(
                func.count(),
                func.count().filter(User.is_verified.is_(True)),
                func.count().filter(User.is_active.is_(True)),
            ).select_from(User)
        )
        total, verified, active = result.one()
        notifications = int(
            await self.db.scalar(select(func.count()).select_from(Notification)) or 0
        )
        return int(total or 0), int(verified or 0), int(active or 0), notifications
