from pathlib import Path

import pytest

from backend.blueprint.generator import BlueprintGenerator
from backend.blueprint.reference_apps import (
    REFERENCE_APPLICATIONS,
    load_reference_config,
    validate_reference_selection,
)
from backend.blueprint.schema import BlueprintConfig, resolve_blueprint


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
    assert resolved.required_capabilities == frozenset({"identity", "platform"})
    assert "ai" in resolved.installed_disabled_capabilities
    assert "rag" in resolved.excluded_modules
    assert resolved.environment["AI_ENABLED"] == "false"


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
    BlueprintGenerator(source).generate(config(), output)
    compose = (output / "deployment" / "docker-compose.yml").read_text(encoding="utf-8")
    assert compose.count("- ../.env.generated") == 3
    assert compose.count("UV_EXTRAS: ''") == 3
    assert "context: ../infra" in compose


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
