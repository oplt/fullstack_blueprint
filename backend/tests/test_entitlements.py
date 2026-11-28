from types import SimpleNamespace

import pytest

from backend.modules.platform import EntitlementService


class FakePlatformRepository:
    def __init__(self, subscription, plan):
        self.subscription = subscription
        self.plan = plan

    async def get_subscription_for_user(self, _user_id):
        return self.subscription

    async def get_plan_by_id(self, _plan_id):
        return self.plan


@pytest.mark.asyncio
async def test_entitlement_evaluation_uses_active_subscription_features() -> None:
    service = EntitlementService.__new__(EntitlementService)
    service.repo = FakePlatformRepository(
        SimpleNamespace(user_id="user-1", plan_id="plan-1", status="active"),
        SimpleNamespace(is_active=True, features_json=["projects.export"]),
    )
    user = SimpleNamespace(id="user-1")

    assert await service.evaluate(user, "projects.export") is True
    assert await service.evaluate(user, "projects.import") is False


@pytest.mark.asyncio
async def test_entitlement_evaluation_fails_closed_for_inactive_subscription() -> None:
    service = EntitlementService.__new__(EntitlementService)
    service.repo = FakePlatformRepository(
        SimpleNamespace(user_id="user-1", plan_id="plan-1", status="canceled"),
        SimpleNamespace(is_active=True, features_json=["projects.export"]),
    )

    assert await service.evaluate(SimpleNamespace(id="user-1"), "projects.export") is False
