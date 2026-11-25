"""YAML contract and profile/module validation for generated projects."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

import yaml
from pydantic import BaseModel, ConfigDict, Field, field_validator

MODULE_TO_CAPABILITY = {
    "identity": "identity",
    "organizations": "organizations",
    "projects": "projects",
    "billing": "billing",
    "api_keys": "api_keys",
    "webhooks": "webhooks",
    "feature_flags": "feature_flags",
    "email_templates": "email_templates",
    "ai": "ai",
    "agents": "ai",
    "rag": "rag",
    "memory": "memory",
    "calendar": "calendar",
    "integrations": "reusable_capabilities",
    "notifications": "reusable_capabilities",
    "analytics": "reusable_capabilities",
    "storage": "reusable_capabilities",
    "workflows": "ai",
    "entitlements": "billing",
}
KNOWN_MODULES = frozenset((*MODULE_TO_CAPABILITY, "entitlements"))
CAPABILITY_DEPENDENCIES = {
    "identity": set(),
    "organizations": {"identity"},
    "projects": {"identity"},
    "billing": {"identity", "platform"},
    "api_keys": {"identity", "platform"},
    "webhooks": {"identity", "platform"},
    "feature_flags": {"identity", "platform"},
    "email_templates": {"identity", "platform"},
    "ai": {"identity"},
    "rag": {"identity", "projects"},
    "memory": {"identity"},
    "calendar": {"identity", "projects"},
    "reusable_capabilities": {"identity", "platform"},
    "platform": {"identity"},
}


class ProjectSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=100)
    slug: str = Field(min_length=1, max_length=64, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class BackendSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    database: Literal["postgresql"] = "postgresql"
    cache: Literal["redis"] = "redis"
    task_queue: Literal["celery"] = "celery"


class DeploymentSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target: Literal["docker", "compose"] = "docker"
    observability: Literal["none", "standard"] = "standard"


class BlueprintConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    project: ProjectSettings
    profile: str
    backend: BackendSettings = Field(default_factory=BackendSettings)
    modules: dict[str, bool] = Field(default_factory=dict)
    providers: dict[str, Any] = Field(default_factory=dict)
    deployment: DeploymentSettings = Field(default_factory=DeploymentSettings)
    generation_mode: Literal["reference", "slim"] = "reference"

    @field_validator("profile")
    @classmethod
    def profile_name(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not normalized:
            raise ValueError("profile is required")
        return normalized

    @classmethod
    def from_yaml(cls, path: Path) -> BlueprintConfig:
        raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        if not isinstance(raw, dict):
            raise ValueError("Blueprint YAML must contain a mapping")
        return cls.model_validate(raw)


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


@dataclass(frozen=True, slots=True)
class ResolvedBlueprint:
    config: BlueprintConfig
    profile: Profile
    enabled_modules: frozenset[str]
    required_capabilities: frozenset[str]
    installed_disabled_capabilities: frozenset[str]
    excluded_modules: frozenset[str]
    optional_dependency_groups: frozenset[str]
    environment: dict[str, str]
    tests: tuple[str, ...]


def resolve_blueprint(config: BlueprintConfig) -> ResolvedBlueprint:
    try:
        profile = PROFILES[config.profile]
    except KeyError as exc:
        raise ValueError(f"Unknown profile: {config.profile}") from exc
    unknown = set(config.modules).difference(KNOWN_MODULES)
    if unknown:
        raise ValueError(f"Unknown modules: {sorted(unknown)}")
    enabled = {name for name, selected in config.modules.items() if selected}
    unsupported = enabled.difference(profile.required_modules | profile.optional_modules)
    if unsupported:
        raise ValueError(f"Profile {profile.name} does not support modules: {sorted(unsupported)}")
    enabled.update(profile.required_modules)
    enabled.difference_update(name for name, selected in config.modules.items() if not selected)
    missing = profile.required_modules.difference(enabled)
    if missing:
        raise ValueError(f"Profile {profile.name} requires modules: {sorted(missing)}")
    capabilities = {MODULE_TO_CAPABILITY[name] for name in enabled}
    capabilities.add("platform")
    changed = True
    while changed:
        changed = False
        for capability in tuple(capabilities):
            dependencies = CAPABILITY_DEPENDENCIES.get(capability, set())
            if not dependencies.issubset(capabilities):
                capabilities.update(dependencies)
                changed = True
    all_optional = frozenset(
        {"ai", "rag", "memory", "reusable_capabilities", "calendar", "billing"}
    )
    installed_disabled = all_optional.difference(capabilities)
    excluded = frozenset(name for name in KNOWN_MODULES if name not in enabled)
    groups = set()
    if "ai" in capabilities:
        groups.add("ai")
    if "rag" in capabilities:
        groups.add("rag")
    if "memory" in capabilities:
        groups.add("memory")
    if "agents" in enabled:
        groups.add("agentic")
    if "workflows" in enabled:
        groups.add("durable")
    if "storage" in enabled:
        groups.add("storage")
    environment = environment_for(config, capabilities)
    return ResolvedBlueprint(
        config,
        profile,
        frozenset(enabled),
        frozenset(capabilities),
        frozenset(installed_disabled),
        excluded,
        frozenset(groups),
        environment,
        profile.tests,
    )


def environment_for(config: BlueprintConfig, capabilities: set[str]) -> dict[str, str]:
    values = {
        "ACCESS_TOKEN_EXPIRE_MINUTES": "15",
        "AI_ENABLED": str("ai" in capabilities).lower(),
        "AI_MCP_ENABLED": str(config.modules.get("agents", False)).lower(),
        "ALLOWED_HOSTS": "localhost,127.0.0.1",
        "ANALYTICS_ENABLED": str("reusable_capabilities" in capabilities).lower(),
        "APP_NAME": config.project.name,
        "BLUEPRINT_PROFILE": config.profile,
        "CORS_ALLOWED_ORIGINS": "http://localhost:5173",
        "DATABASE_URL": "postgresql+asyncpg://app:change-me@localhost:5432/app",
        "INTEGRATIONS_ENABLED": str("reusable_capabilities" in capabilities).lower(),
        "JWT_ALGORITHM": "HS256",
        "JWT_SECRET": "replace-in-local-secret-storage",
        "MEMORY_ENABLED": str("memory" in capabilities).lower(),
        "MEM0_MODE": "oss" if "memory" in capabilities else "hosted",
        "OBSERVABILITY_ENABLED": str(config.deployment.observability == "standard").lower(),
        "RAG_ENABLED": str("rag" in capabilities).lower(),
        "REDIS_URL": "redis://localhost:6379/0",
        "REFRESH_TOKEN_EXPIRE_DAYS": "7",
    }
    return dict(sorted(values.items()))
