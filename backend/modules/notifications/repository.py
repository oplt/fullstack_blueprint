from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.pagination import DEFAULT_PAGE_LIMIT, paginate_scalars
from backend.modules.notifications.models import (
    Notification,
    NotificationDelivery,
    NotificationPreference,
)


class NotificationsRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        user_id: str,
        type: str,
        title: str,
        body: str | None = None,
        *,
        channel: str = "in_app",
        template_key: str | None = None,
        locale: str = "en",
        dedupe_key: str | None = None,
    ) -> Notification:
        notification = Notification(
            user_id=user_id,
            type=type,
            title=title,
            body=body,
            channel=channel,
            template_key=template_key,
            locale=locale,
            dedupe_key=dedupe_key,
        )
        self.db.add(notification)
        await self.db.flush()
        return notification

    async def create_delivery(self, notification_id: str, channel: str) -> NotificationDelivery:
        delivery = NotificationDelivery(notification_id=notification_id, channel=channel)
        self.db.add(delivery)
        await self.db.flush()
        return delivery

    async def get_by_dedupe(self, dedupe_key: str) -> Notification | None:
        result = await self.db.execute(
            select(Notification).where(Notification.dedupe_key == dedupe_key)
        )
        return result.scalar_one_or_none()

    async def list_for_user(
        self,
        user_id: str,
        *,
        limit: int = DEFAULT_PAGE_LIMIT,
        offset: int = 0,
    ) -> tuple[list[Notification], int]:
        stmt = (
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
        )
        return await paginate_scalars(self.db, stmt, limit=limit, offset=offset)

    async def get_by_id(self, notification_id: str) -> Notification | None:
        result = await self.db.execute(
            select(Notification).where(Notification.id == notification_id)
        )
        return result.scalar_one_or_none()

    async def mark_read(self, notification: Notification) -> None:
        notification.is_read = True
        await self.db.flush()

    async def mark_all_read(self, user_id: str) -> None:
        await self.db.execute(
            update(Notification)
            .where(Notification.user_id == user_id, Notification.is_read.is_(False))
            .values(is_read=True)
        )

    async def get_or_create_preferences(self, user_id: str) -> NotificationPreference:
        result = await self.db.execute(
            select(NotificationPreference).where(NotificationPreference.user_id == user_id)
        )
        prefs = result.scalar_one_or_none()
        if not prefs:
            prefs = NotificationPreference(user_id=user_id)
            self.db.add(prefs)
            await self.db.flush()
        return prefs
