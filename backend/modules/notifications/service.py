"""Notification application service and transaction owner."""

from __future__ import annotations

from collections.abc import Awaitable, Callable, Sequence
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.notifications.models import (
    Notification,
    NotificationDelivery,
    NotificationPreference,
)
from backend.modules.notifications.repository import NotificationsRepository


class NotificationsService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repository = NotificationsRepository(db)

    async def list_for_user(self, user_id: str, *, limit: int, offset: int):
        return await self.repository.list_for_user(user_id, limit=limit, offset=offset)

    async def mark_read(self, user_id: str, notification_id: str) -> None:
        notification = await self.repository.get_by_id(notification_id)
        if notification is None or notification.user_id != user_id:
            raise HTTPException(status_code=404, detail="Notification not found")
        await self.repository.mark_read(notification)
        await self.save()

    async def mark_all_read(self, user_id: str) -> None:
        await self.repository.mark_all_read(user_id)
        await self.save()

    async def get_preferences(self, user_id: str) -> NotificationPreference:
        preferences = await self.repository.get_or_create_preferences(user_id)
        await self.save()
        return preferences

    async def update_preferences(
        self,
        user_id: str,
        *,
        email_enabled: bool | None,
        push_enabled: bool | None,
        marketing_enabled: bool | None,
        locale: str | None = None,
    ) -> NotificationPreference:
        preferences = await self.repository.get_or_create_preferences(user_id)
        if email_enabled is not None:
            preferences.email_enabled = email_enabled
        if push_enabled is not None:
            preferences.push_enabled = push_enabled
        if marketing_enabled is not None:
            preferences.marketing_enabled = marketing_enabled
        if locale is not None:
            preferences.locale = locale
        await self.save()
        return preferences

    async def save(self) -> None:
        await self.db.commit()

    async def publish(
        self,
        user_id: str,
        *,
        notification_type: str,
        title: str,
        body: str | None = None,
        channels: Sequence[str] = ("in_app",),
        template_key: str | None = None,
        locale: str | None = None,
        dedupe_key: str | None = None,
    ) -> list[Notification]:
        """Persist preferred channel deliveries; workers own transport execution."""
        preferences = await self.repository.get_or_create_preferences(user_id)
        selected: list[str] = []
        for channel in dict.fromkeys(channels):
            if channel == "email" and not preferences.email_enabled:
                continue
            if channel == "push" and not preferences.push_enabled:
                continue
            if channel == "marketing" and not preferences.marketing_enabled:
                continue
            selected.append(channel)
        rows: list[Notification] = []
        for channel in selected:
            channel_dedupe = f"{dedupe_key}:{channel}" if dedupe_key else None
            if channel_dedupe:
                existing = await self.repository.get_by_dedupe(channel_dedupe)
                if existing:
                    rows.append(existing)
                    continue
            row = await self.repository.create(
                user_id,
                notification_type,
                title,
                body,
                channel=channel,
                template_key=template_key,
                locale=locale or preferences.locale,
                dedupe_key=channel_dedupe,
            )
            await self.repository.create_delivery(row.id, channel)
            rows.append(row)
        await self.save()
        return rows

    async def dispatch_delivery(
        self,
        delivery: NotificationDelivery,
        sender: Callable[[Notification], Awaitable[None]],
    ) -> None:
        notification = await self.db.get(Notification, delivery.notification_id)
        if notification is None:
            delivery.status = "dead_letter"
            delivery.last_error = "Notification no longer exists"
        else:
            delivery.attempt_count += 1
            notification.attempt_count = delivery.attempt_count
            try:
                await sender(notification)
            except Exception as exc:
                delivery.status = "retrying" if delivery.attempt_count < 5 else "dead_letter"
                delivery.last_error = str(exc)[:1000]
                notification.delivery_status = delivery.status
                notification.last_error = delivery.last_error
            else:
                delivery.status = "delivered"
                delivery.delivered_at = datetime.now(UTC)
                notification.delivery_status = "delivered"
                notification.delivered_at = delivery.delivered_at
        await self.save()
