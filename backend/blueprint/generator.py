"""Safe, deterministic generation and update workflow for blueprint projects."""

from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path
from typing import Any

import yaml

from backend.blueprint.schema import BlueprintConfig, ResolvedBlueprint, resolve_blueprint

TEMPLATE_VERSION = "2026.11.phase11"
GENERATED_DIR = ".blueprint"
IGNORED_NAMES = shutil.ignore_patterns(
    ".git",
    ".agents",
    ".aws",
    ".codex",
    ".venv",
    ".pnpm-store",
    "node_modules",
    "dist",
    "__pycache__",
    ".pytest_cache",
    ".ruff_cache",
    ".coverage",
    ".env",
    ".env.local",
    ".env.*.local",
    "backend_prompt.txt",
    "*.pem",
    "*.key",
    "*.pyc",
    "*.egg-info",
    "logs",
    "coverage.xml",
)


class BlueprintGenerator:
    def __init__(self, source_root: Path, *, template_version: str = TEMPLATE_VERSION) -> None:
        self.source_root = source_root.resolve()
        self.template_version = template_version

    def validate(self, config: BlueprintConfig) -> ResolvedBlueprint:
        return resolve_blueprint(config)

    def generate(self, config: BlueprintConfig, output: Path) -> ResolvedBlueprint:
        resolved = self.validate(config)
        target = output.resolve()
        self._validate_target(target)
        shutil.copytree(self.source_root, target, ignore=IGNORED_NAMES, dirs_exist_ok=True)
        self._write_artifacts(target, resolved)
        return resolved

    def update(self, config: BlueprintConfig, project: Path) -> ResolvedBlueprint:
        resolved = self.validate(config)
        target = project.resolve()
        marker = target / GENERATED_DIR / "manifest.json"
        if not marker.is_file():
            raise ValueError(f"Not a generated blueprint project: {target}")
        previous = json.loads(marker.read_text(encoding="utf-8"))
        if previous.get("generator") != "fullstack-blueprint":
            raise ValueError("Generated project marker is not compatible")
        self._write_artifacts(target, resolved)
        return resolved

    def _validate_target(self, target: Path) -> None:
        if target == self.source_root or self.source_root in target.parents:
            raise ValueError("Generated output must be outside the blueprint repository")
        if target.exists() and any(target.iterdir()):
            raise ValueError("Generation target must be new or empty")

    def _write_artifacts(self, target: Path, resolved: ResolvedBlueprint) -> None:
        metadata = self._metadata(resolved)
        generated = target / GENERATED_DIR
        generated.mkdir(parents=True, exist_ok=True)
        _write_json(generated / "manifest.json", metadata)
        _write_yaml(generated / "blueprint.yml", resolved.config.model_dump(mode="json"))
        _write_text(target / ".env.generated", _render_env(resolved.environment))
        _write_text(target / "docs" / "GENERATED_PROJECT.md", _render_document(resolved, metadata))
        deployment = target / "deployment"
        deployment.mkdir(parents=True, exist_ok=True)
        _write_text(deployment / "README.md", _render_deployment(resolved))
        compose = self.source_root / "infra" / "docker-compose.yml"
        if compose.is_file():
            extras = " ".join(
                f"--extra {group}" for group in sorted(resolved.optional_dependency_groups)
            )
            compose_data = yaml.safe_load(compose.read_text(encoding="utf-8"))
            for service, config in compose_data.get("services", {}).items():
                if service in {"migrate", "api", "worker"}:
                    config["env_file"] = _merge_env_files(
                        config.get("env_file"), "../.env.generated"
                    )
                build = config.get("build")
                if isinstance(build, dict):
                    if service == "minio":
                        build["context"] = "../infra"
                    else:
                        build["context"] = ".."
                    if service in {"migrate", "api", "worker"}:
                        build["dockerfile"] = "infra/backend.Dockerfile"
                        build["args"] = {**build.get("args", {}), "UV_EXTRAS": extras}
            _write_text(
                deployment / "docker-compose.yml",
                yaml.safe_dump(compose_data, sort_keys=False),
            )

    def _metadata(self, resolved: ResolvedBlueprint) -> dict[str, Any]:
        config_json = json.dumps(
            resolved.config.model_dump(mode="json"), sort_keys=True, separators=(",", ":")
        )
        return {
            "generator": "fullstack-blueprint",
            "template_version": self.template_version,
            "generation_mode": resolved.config.generation_mode,
            "config_sha256": hashlib.sha256(config_json.encode()).hexdigest(),
            "profile": resolved.profile.name,
            "default_settings": dict(sorted(resolved.profile.default_settings.items())),
            "enabled_modules": sorted(resolved.enabled_modules),
            "required_capabilities": sorted(resolved.required_capabilities),
            "installed_disabled_capabilities": sorted(resolved.installed_disabled_capabilities),
            "excluded_modules": sorted(resolved.excluded_modules),
            "optional_dependency_groups": sorted(resolved.optional_dependency_groups),
            "api_router_capabilities": sorted(resolved.required_capabilities),
            "background_workers": _background_workers(resolved),
            "deployment_target": resolved.config.deployment.target,
            "migration_policy": "preserve_historical_migrations",
            "migration_head": "0007_organizations",
            "tests": list(resolved.tests),
            "infrastructure": list(resolved.profile.infrastructure),
            "security_requirements": list(resolved.profile.security_requirements),
        }


def _write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def _write_json(path: Path, value: dict[str, Any]) -> None:
    _write_text(path, json.dumps(value, indent=2, sort_keys=True) + "\n")


def _write_yaml(path: Path, value: dict[str, Any]) -> None:
    _write_text(path, yaml.safe_dump(value, sort_keys=False))


def _render_env(values: dict[str, str]) -> str:
    header = "# Generated by fullstack-blueprint; move secrets to deployment storage.\n"
    return header + "".join(f"{key}={value}\n" for key, value in values.items())


def _render_document(resolved: ResolvedBlueprint, metadata: dict[str, Any]) -> str:
    disabled = ", ".join(sorted(resolved.installed_disabled_capabilities)) or "none"
    lines = [
        f"# Generated project: {resolved.config.project.name}",
        "",
        f"Profile: `{resolved.profile.name}`",
        f"Template version: `{metadata['template_version']}`",
        "",
        "## Selection",
        "",
        f"Enabled modules: {', '.join(sorted(resolved.enabled_modules))}",
        f"Required capabilities: {', '.join(sorted(resolved.required_capabilities))}",
        f"Installed but runtime-disabled: {disabled}",
        "Optional dependency groups: "
        f"{', '.join(sorted(resolved.optional_dependency_groups)) or 'none'}",
        "",
        "Historical migrations are preserved. Optional APIs are disabled through generated "
        "settings; source removal is never inferred from a profile.",
        "",
        "## Next steps",
        "",
        "1. Copy `.env.generated` to deployment-managed environment storage and replace "
        "placeholder secrets.",
        "2. Run `make setup`, `make check`, `make test`, and `cd frontend && npm run build`.",
        "3. Install only the optional dependency groups listed in the manifest when needed "
        "(for example, `uv sync --extra ai`).",
        "4. Apply migrations with `alembic upgrade head` against a disposable validation "
        "database first.",
    ]
    if resolved.profile.notes:
        lines.extend(
            ["", "## Profile notes", "", *[f"- {note}" for note in resolved.profile.notes]]
        )
    return "\n".join(lines) + "\n"


def _render_deployment(resolved: ResolvedBlueprint) -> str:
    return (
        "\n".join(
            [
                f"# Deployment assumptions: `{resolved.profile.name}`",
                "",
                f"Infrastructure: {', '.join(resolved.profile.infrastructure)}.",
                "The copied Compose file keeps optional services behind profiles. Start only "
                "the services required by this manifest.",
                "",
                "```bash",
                "docker compose -f deployment/docker-compose.yml up -d postgres redis",
                "docker compose -f deployment/docker-compose.yml --profile ops run --rm migrate",
                "docker compose -f deployment/docker-compose.yml --profile app up -d api",
                *(
                    [
                        "docker compose -f deployment/docker-compose.yml --profile worker "
                        "up -d worker"
                    ]
                    if resolved.config.backend.task_queue == "celery"
                    else []
                ),
                "```",
            ]
        )
        + "\n"
    )


def _background_workers(resolved: ResolvedBlueprint) -> list[str]:
    workers = ["celery"] if resolved.config.backend.task_queue == "celery" else []
    if "rag" in resolved.required_capabilities:
        workers.append("rag-indexing")
    if "memory" in resolved.required_capabilities:
        workers.append("memory-extraction")
    if "ai" in resolved.required_capabilities:
        workers.append("ai-evaluation")
    return workers


def _merge_env_files(current: Any, generated: str) -> list[str]:
    if current is None:
        existing: list[str] = []
    elif isinstance(current, str):
        existing = [current]
    else:
        existing = list(current)
    if generated not in existing:
        existing.append(generated)
    return existing
