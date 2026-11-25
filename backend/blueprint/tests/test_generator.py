from pathlib import Path

import pytest
import yaml

from backend.blueprint.generator import BlueprintGenerator
from backend.blueprint.reference_apps import (
    REFERENCE_APPLICATIONS,
    load_reference_config,
    validate_reference_selection,
)
from backend.blueprint.schema import PROFILES, BlueprintConfig, resolve_blueprint


def config(**overrides) -> BlueprintConfig:
    value = {
        "project": {"name": "Test Product", "slug": "test-product"},
        "profile": "minimal_api",
        "modules": {"identity": True},
    }
    value.update(overrides)
    return BlueprintConfig.model_validate(value)


def test_profile_resolves_capability_dependencies_and_disabled_runtime() -> None:
    resolved = resolve_blueprint(config())
    assert resolved.required_capabilities == frozenset({"identity"})
    assert "ai" in resolved.installed_disabled_capabilities
    assert "rag" in resolved.excluded_modules
    assert resolved.environment["AI_ENABLED"] == "false"
    assert resolved.environment["AI_MCP_ENABLED"] == "false"
    assert resolved.environment["PROJECTS_ENABLED"] == "false"
    assert resolved.environment["PLATFORM_API_ENABLED"] == "false"


def test_agents_resolve_as_separate_capability_and_require_celery() -> None:
    resolved = resolve_blueprint(
        config(
            profile="automation",
            backend={"task_queue": "celery"},
            modules={"identity": True, "ai": True, "agents": True, "integrations": True},
        )
    )
    assert {"ai", "agents"}.issubset(resolved.required_capabilities)
    assert resolved.environment["AI_ENABLED"] == "true"
    assert resolved.environment["AI_MCP_ENABLED"] == "true"


def test_optional_background_capabilities_require_task_queue() -> None:
    with pytest.raises(ValueError, match=r"require backend.task_queue: celery"):
        resolve_blueprint(
            config(
                profile="ai_saas",
                modules={"identity": True, "projects": True, "ai": True},
            )
        )


def test_dependency_modules_are_enabled_and_explicit_conflicts_rejected() -> None:
    resolved = resolve_blueprint(config(modules={"identity": True, "calendar": True}))
    assert {"calendar", "projects"}.issubset(resolved.enabled_modules)
    assert resolved.environment["PROJECTS_ENABLED"] == "true"

    with pytest.raises(ValueError, match="explicitly disabled modules"):
        resolve_blueprint(config(modules={"identity": True, "calendar": True, "projects": False}))


def test_repository_default_is_minimal_and_worker_free() -> None:
    source_root = Path(__file__).resolve().parents[3]
    resolved = resolve_blueprint(BlueprintConfig.from_yaml(source_root / "blueprint.yml"))

    assert resolved.profile.name == "minimal_api"
    assert resolved.required_capabilities == frozenset({"identity"})
    assert resolved.config.backend.task_queue == "none"
    assert resolved.environment["CELERY_TASK_ALWAYS_EAGER"] == "true"
    assert resolved.environment["OBSERVABILITY_ENABLED"] == "false"


def test_all_profiles_resolve_their_required_modules() -> None:
    for profile in PROFILES.values():
        resolved = resolve_blueprint(
            config(
                profile=profile.name,
                backend={"task_queue": "celery"},
                modules={name: True for name in profile.required_modules},
            )
        )
        assert profile.required_modules.issubset(resolved.enabled_modules)


def test_entitlements_resolve_through_billing() -> None:
    resolved = resolve_blueprint(
        config(
            profile="lean_saas",
            modules={"identity": True, "projects": True, "billing": True, "entitlements": True},
        )
    )
    assert "billing" in resolved.required_capabilities


def test_profile_rejects_modules_outside_its_declared_selection() -> None:
    with pytest.raises(ValueError, match="does not support modules"):
        resolve_blueprint(config(modules={"identity": True, "billing": True}))


def test_generation_artifacts_are_deterministic_and_update_is_safe(tmp_path: Path) -> None:
    source = tmp_path / "source"
    source.mkdir()
    (source / "README.md").write_text("reference", encoding="utf-8")
    (source / ".env").write_text("SECRET=do-not-copy", encoding="utf-8")
    (source / ".aws").mkdir()
    (source / ".aws" / "credentials").write_text("secret", encoding="utf-8")
    (source / ".pnpm-store").mkdir()
    (source / ".pnpm-store" / "index.db").write_text("cache", encoding="utf-8")
    output = tmp_path / "generated"
    generator = BlueprintGenerator(source)
    generator.generate(config(), output)
    manifest = output / ".blueprint" / "manifest.json"
    first = manifest.read_text(encoding="utf-8")
    (output / "user-file.txt").write_text("preserve", encoding="utf-8")
    generator.update(config(), output)
    assert manifest.read_text(encoding="utf-8") == first
    assert (output / "user-file.txt").read_text(encoding="utf-8") == "preserve"
    assert not (output / ".env").exists()
    assert not (output / ".aws").exists()
    assert not (output / ".pnpm-store").exists()


def test_generated_compose_uses_generated_environment_and_root_infra(tmp_path: Path) -> None:
    source = tmp_path / "source"
    (source / "infra").mkdir(parents=True)
    (source / "infra" / "docker-compose.yml").write_text(
        "services:\n"
        "  migrate:\n    build:\n      context: ..\n      dockerfile: infra/backend.Dockerfile\n"
        "  api:\n    build:\n      context: ..\n      dockerfile: infra/backend.Dockerfile\n"
        "  worker:\n    build:\n      context: ..\n      dockerfile: infra/backend.Dockerfile\n"
        "  minio:\n    build:\n      context: ./infra\n",
        encoding="utf-8",
    )
    output = tmp_path / "generated"
    generator = BlueprintGenerator(source)
    generator.generate(config(), output)
    generator.update(config(), output)
    compose = (output / "deployment" / "docker-compose.yml").read_text(encoding="utf-8")
    compose_data = yaml.safe_load(compose)
    assert compose.count("- ../.env.generated") == 3
    assert compose.count("UV_EXTRAS: ''") == 3
    assert "context: ../infra" in compose
    assert compose_data["services"]["api"]["build"]["context"] == ".."
    assert compose_data["services"]["minio"]["build"]["context"] == "../infra"


def test_generation_refuses_source_tree_or_nonempty_target(tmp_path: Path) -> None:
    source = tmp_path / "source"
    source.mkdir()
    output = tmp_path / "output"
    output.mkdir()
    (output / "existing").write_text("data", encoding="utf-8")
    generator = BlueprintGenerator(source)
    with pytest.raises(ValueError, match="new or empty"):
        generator.generate(config(), output)


def test_phase11_reference_configurations_validate_selection() -> None:
    source_root = Path(__file__).resolve().parents[3]
    resolved_by_key = {}
    for application in REFERENCE_APPLICATIONS:
        resolved = resolve_blueprint(load_reference_config(source_root, application))
        validate_reference_selection(application, resolved)
        resolved_by_key[application.key] = resolved

    traditional = next(item for item in REFERENCE_APPLICATIONS if item.key == "traditional-saas")
    assert "organizations" in resolved_by_key[traditional.key].required_capabilities
    assert resolved_by_key["ai-knowledge-platform"].environment["MEM0_MODE"] == "oss"
    assert resolved_by_key["agent-automation-platform"].environment["AI_MCP_ENABLED"] == "true"
