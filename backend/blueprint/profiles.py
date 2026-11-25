"""Blueprint profile catalog."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Profile:
    name: str
    required_modules: frozenset[str]
    optional_modules: frozenset[str]
    default_settings: dict[str, bool]
    infrastructure: tuple[str, ...]
    security_requirements: tuple[str, ...]
    tests: tuple[str, ...]
    deployment_assumptions: tuple[str, ...]
    notes: tuple[str, ...] = ()


def _profile(
    name: str,
    required: set[str],
    optional: set[str],
    infrastructure: tuple[str, ...],
    security: tuple[str, ...],
    tests: tuple[str, ...],
    deployment: tuple[str, ...],
    notes: tuple[str, ...] = (),
) -> Profile:
    return Profile(
        name,
        frozenset(required),
        frozenset(optional),
        {"ai": "ai" in required, "rag": "rag" in required, "memory": "memory" in required},
        infrastructure,
        security,
        tests,
        deployment,
        notes,
    )


PROFILES = {
    profile.name: profile
    for profile in (
        _profile(
            "minimal_api",
            {"identity"},
            {"projects", "calendar"},
            ("postgresql", "redis"),
            ("secure_cookies", "explicit_cors"),
            ("backend/tests",),
            ("docker_api",),
        ),
        _profile(
            "lean_saas",
            {"identity", "projects"},
            {
                "organizations",
                "billing",
                "entitlements",
                "feature_flags",
                "notifications",
                "storage",
                "analytics",
            },
            ("postgresql", "redis", "celery"),
            ("secure_cookies", "explicit_cors", "csrf"),
            ("backend/tests", "frontend"),
            ("docker_api", "celery_worker"),
        ),
        _profile(
            "ai_saas",
            {"identity", "projects", "ai"},
            {
                "organizations",
                "billing",
                "rag",
                "memory",
                "agents",
                "integrations",
                "notifications",
                "storage",
                "analytics",
            },
            ("postgresql", "redis", "celery"),
            ("secure_cookies", "csrf", "ai_budgets"),
            ("backend/modules/ai/tests", "frontend"),
            ("docker_api", "celery_worker"),
        ),
        _profile(
            "knowledge_base",
            {"identity", "projects", "ai", "rag"},
            {
                "organizations",
                "memory",
                "storage",
                "notifications",
                "analytics",
                "billing",
            },
            ("postgresql_pgvector", "redis", "celery", "object_storage"),
            ("secure_cookies", "csrf", "upload_limits", "tenant_rag_acl"),
            ("backend/modules/rag/tests",),
            ("docker_api", "celery_worker", "pgvector"),
        ),
        _profile(
            "automation",
            {"identity", "ai", "agents", "integrations"},
            {
                "organizations",
                "workflows",
                "notifications",
                "memory",
                "analytics",
                "storage",
            },
            ("postgresql", "redis", "celery"),
            ("secure_cookies", "csrf", "tool_approval", "integration_secrets"),
            ("backend/modules/ai/tests",),
            ("docker_api", "celery_worker"),
        ),
        _profile(
            "enterprise_saas",
            {"identity", "organizations", "projects", "billing", "integrations", "analytics"},
            {"ai", "rag", "memory", "notifications", "storage"},
            ("postgresql", "redis", "celery"),
            ("secure_cookies", "csrf", "audit_logging", "explicit_cors"),
            ("backend/tests",),
            ("docker_api", "celery_worker"),
        ),
        _profile(
            "marketplace",
            {"identity", "projects", "billing", "integrations"},
            {"notifications", "analytics", "storage", "ai"},
            ("postgresql", "redis", "celery"),
            ("secure_cookies", "csrf", "payment_provider_review"),
            ("backend/tests",),
            ("docker_api", "celery_worker"),
            ("Payment, payout, tax, and regulatory marketplace flows are not included.",),
        ),
        _profile(
            "internal_tool",
            {"identity", "projects"},
            {"calendar", "notifications", "analytics", "storage"},
            ("postgresql", "redis"),
            ("secure_cookies", "csrf", "trusted_network_review"),
            ("backend/tests",),
            ("docker_api",),
        ),
    )
}
