"""YAML contract and profile/module validation for generated projects."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal
import yaml
from pydantic import BaseModel, ConfigDict, Field, field_validator
from backend.blueprint.environment import environment_for
from backend.blueprint.profiles import PROFILES, Profile
from backend.modules.capabilities import CAPABILITY_REGISTRY

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
    "agents": "agents",
    "rag": "rag",
    "memory": "memory",
    "calendar": "calendar",
    "integrations": "reusable_capabilities",
    "notifications": "notifications",
    "analytics": "reusable_capabilities",
    "storage": "reusable_capabilities",
    "workflows": "ai",
    "entitlements": "billing",
}
KNOWN_MODULES = frozenset(MODULE_TO_CAPABILITY)


class ProjectSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=100)
    slug: str = Field(min_length=1, max_length=64, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class BackendSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    database: Literal["postgresql"] = "postgresql"
    cache: Literal["redis"] = "redis"
    task_queue: Literal["none", "celery"] = "none"


class DeploymentSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target: Literal["docker", "compose"] = "docker"
    observability: Literal["none", "standard"] = "none"


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
    capabilities = _resolve_capabilities(enabled)
    dependency_modules = capabilities.intersection(KNOWN_MODULES)
    explicitly_disabled = {name for name, selected in config.modules.items() if not selected}
    conflicts = dependency_modules.intersection(explicitly_disabled)
    if conflicts:
        raise ValueError(
            f"Enabled modules require explicitly disabled modules: {sorted(conflicts)}"
        )
    unsupported_dependencies = dependency_modules.difference(
        profile.required_modules | profile.optional_modules
    )
    if unsupported_dependencies:
        raise ValueError(
            f"Profile {profile.name} does not support required modules: "
            f"{sorted(unsupported_dependencies)}"
        )
    enabled.update(dependency_modules)
    _require_task_queue(config, capabilities)
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


def _resolve_capabilities(enabled_modules: set[str]) -> set[str]:
    capabilities = {MODULE_TO_CAPABILITY[name] for name in enabled_modules}
    pending = list(capabilities)
    while pending:
        for dependency in CAPABILITY_REGISTRY.get(pending.pop()).dependencies:
            if dependency not in capabilities:
                capabilities.add(dependency)
                pending.append(dependency)
    return capabilities


def _require_task_queue(config: BlueprintConfig, capabilities: set[str]) -> None:
    queued_capabilities = {"ai", "agents", "rag", "memory", "reusable_capabilities"}
    if config.backend.task_queue == "none" and capabilities.intersection(queued_capabilities):
        raise ValueError("Selected capabilities require backend.task_queue: celery")
