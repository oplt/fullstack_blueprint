"""Lazy public platform configuration facade.

The capability registry remains authoritative for availability. Lazy exports
keep persistence modules independent from this convenience facade and avoid
import cycles during application composition.
"""

from importlib import import_module
from typing import Any

_EXPORTS: dict[str, tuple[str, str]] = {
    "PlatformConfigService": (
        "backend.modules.platform.service",
        "PlatformConfigService",
    ),
    "EntitlementService": (
        "backend.modules.billing.entitlements",
        "EntitlementService",
    ),
    "BillingService": ("backend.modules.billing.service", "BillingService"),
    "FeatureFlagService": ("backend.modules.platform.flags", "FeatureFlagService"),
    "ApiKeyService": ("backend.modules.integrations.api_keys", "ApiKeyService"),
    "WebhookService": ("backend.modules.integrations.webhooks", "WebhookService"),
    "EmailTemplateService": (
        "backend.modules.notifications.templates",
        "EmailTemplateService",
    ),
    "sign_webhook_payload": (
        "backend.modules.integrations.webhook_jobs",
        "sign_webhook_payload",
    ),
    "verify_webhook_signature": (
        "backend.modules.integrations.webhook_jobs",
        "verify_webhook_signature",
    ),
}

for _name in (
    "ApiKeyCreateRequest",
    "ApiKeyCreateResponse",
    "ApiKeyResponse",
    "ApiKeyRotateRequest",
    "CapabilityManifestResponse",
    "EffectiveFeatureFlagResponse",
    "EmailTemplateCreate",
    "EmailTemplateResponse",
    "EmailTemplateUpdate",
    "EntitlementResponse",
    "FeatureFlagCreate",
    "FeatureFlagResponse",
    "FeatureFlagUpdate",
    "PlatformConfigResponse",
    "PlatformConfigUpdateRequest",
    "PlatformMetadataResponse",
    "SubscriptionPlanCreate",
    "SubscriptionPlanResponse",
    "SubscriptionPlanUpdate",
    "SubscriptionSelectionRequest",
    "UserSubscriptionResponse",
    "WebhookEndpointCreate",
    "WebhookEndpointCreateResponse",
    "WebhookEndpointResponse",
    "WebhookEndpointUpdate",
    "WebhookTestResponse",
):
    _EXPORTS[_name] = ("backend.modules.platform.schemas", _name)


def __getattr__(name: str) -> Any:
    try:
        module_name, attribute = _EXPORTS[name]
    except KeyError as exc:
        raise AttributeError(name) from exc
    value = getattr(import_module(module_name), attribute)
    globals()[name] = value
    return value


__all__ = tuple(sorted(_EXPORTS))
