import pytest

from backend.core.config import settings
from backend.modules.admin.platform import PlatformConfigService


def test_module_pack_resolves_its_catalog_modules(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "AI_ENABLED", True)
    assert PlatformConfigService._resolve_enabled_modules("lean_saas", {}) == [
        "ai",
        "billing",
        "api_keys",
        "feature_flags",
    ]


def test_explicit_module_overrides_take_precedence_over_pack(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "AI_ENABLED", True)
    assert PlatformConfigService._resolve_enabled_modules(
        "lean_saas", {"billing": False, "webhooks": True}
    ) == ["ai", "api_keys", "webhooks", "feature_flags"]


def test_module_pack_excludes_deployment_disabled_modules(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "AI_ENABLED", False)
    assert PlatformConfigService._resolve_enabled_modules("lean_saas", {}) == [
        "billing",
        "api_keys",
        "feature_flags",
    ]
