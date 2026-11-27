"""Reference application configurations and integration validation helpers."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from backend.blueprint.generator import BlueprintGenerator
from backend.blueprint.schema import BlueprintConfig, ResolvedBlueprint


@dataclass(frozen=True, slots=True)
class ReferenceApplication:
    key: str
    config_file: str
    profile: str
    required_capabilities: frozenset[str]
    forbidden_capabilities: frozenset[str]
    required_dependency_groups: frozenset[str]
    notes: tuple[str, ...] = ()


REFERENCE_APPLICATIONS = (
    ReferenceApplication(
        key="traditional-saas",
        config_file="traditional-saas.yml",
        profile="lean_saas",
        required_capabilities=frozenset(
            {"identity", "organizations", "projects", "billing", "platform"}
        ),
        forbidden_capabilities=frozenset({"ai", "rag", "memory"}),
        required_dependency_groups=frozenset(),
        notes=("Audit logs are a baseline capability.",),
    ),
    ReferenceApplication(
        key="ai-knowledge-platform",
        config_file="ai-knowledge-platform.yml",
        profile="knowledge_base",
        required_capabilities=frozenset(
            {"identity", "organizations", "projects", "ai", "rag", "memory"}
        ),
        forbidden_capabilities=frozenset(),
        required_dependency_groups=frozenset({"ai", "rag", "memory", "storage"}),
    ),
    ReferenceApplication(
        key="agent-automation-platform",
        config_file="agent-automation-platform.yml",
        profile="automation",
        required_capabilities=frozenset(
            {"identity", "organizations", "ai", "reusable_capabilities"}
        ),
        forbidden_capabilities=frozenset({"rag"}),
        required_dependency_groups=frozenset({"ai", "agentic", "durable"}),
    ),
)


def reference_config_root(source_root: Path) -> Path:
    return source_root / "backend" / "blueprint" / "reference_configs"


def load_reference_config(source_root: Path, application: ReferenceApplication) -> BlueprintConfig:
    path = reference_config_root(source_root) / application.config_file
    return BlueprintConfig.from_yaml(path)


def validate_reference_selection(
    application: ReferenceApplication, resolved: ResolvedBlueprint
) -> None:
    if resolved.profile.name != application.profile:
        raise ValueError(
            f"{application.key} expects profile {application.profile}, got {resolved.profile.name}"
        )
    missing = application.required_capabilities.difference(resolved.required_capabilities)
    if missing:
        raise ValueError(f"{application.key} is missing capabilities: {sorted(missing)}")
    unexpected = application.forbidden_capabilities.intersection(resolved.required_capabilities)
    if unexpected:
        raise ValueError(f"{application.key} selected forbidden capabilities: {sorted(unexpected)}")
    missing_groups = application.required_dependency_groups.difference(
        resolved.optional_dependency_groups
    )
    if missing_groups:
        raise ValueError(
            f"{application.key} is missing dependency groups: {sorted(missing_groups)}"
        )


def generate_reference_apps(source_root: Path, output_root: Path) -> dict[str, dict[str, Any]]:
    source_root = source_root.resolve()
    output_root = output_root.resolve()
    if output_root == source_root or source_root in output_root.parents:
        raise ValueError(
            "Reference applications must be generated outside the blueprint repository"
        )
    if output_root.exists() and any(output_root.iterdir()):
        raise ValueError("Reference application output must be new or empty")
    output_root.mkdir(parents=True, exist_ok=True)

    generator = BlueprintGenerator(source_root)
    report: dict[str, dict[str, Any]] = {}
    for application in REFERENCE_APPLICATIONS:
        config = load_reference_config(source_root, application)
        resolved = generator.generate(config, output_root / application.key)
        validate_reference_selection(application, resolved)
        report[application.key] = {
            "profile": resolved.profile.name,
            "enabled_modules": sorted(resolved.enabled_modules),
            "required_capabilities": sorted(resolved.required_capabilities),
            "optional_dependency_groups": sorted(resolved.optional_dependency_groups),
            "forbidden_capabilities": sorted(application.forbidden_capabilities),
            "notes": list(application.notes),
        }
    (output_root / "reference-applications.json").write_text(
        json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    return report
