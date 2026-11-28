from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.identity.models import User
from backend.modules.admin.platform.repository import PlatformRepository


class EntitlementService:
    """Evaluate plan feature keys without replacing resource authorization."""

    def __init__(self, db: AsyncSession):
        self.repo = PlatformRepository(db)

    async def evaluate(self, user: User, key: str) -> bool:
        subscription = await self.repo.get_subscription_for_user(user.id)
        if subscription is None or subscription.status != "active":
            return False
        plan = await self.repo.get_plan_by_id(subscription.plan_id)
        if plan is None or not plan.is_active:
            return False
        return key in set(plan.features_json or [])

    async def require(self, user: User, key: str) -> None:
        if not await self.evaluate(user, key):
            raise HTTPException(status_code=403, detail="Required entitlement is not active")
