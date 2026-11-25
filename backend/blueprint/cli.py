"""Command line interface for validating and generating blueprint projects."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from backend.blueprint.generator import BlueprintGenerator
from backend.blueprint.reference_apps import generate_reference_apps
from backend.blueprint.schema import PROFILES, BlueprintConfig


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="blueprint", description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    profiles = subparsers.add_parser("profiles", help="List supported profiles")
    profiles.set_defaults(handler=_profiles)
    reference_apps = subparsers.add_parser(
        "reference-apps", help="Generate the Phase 11 isolated reference applications"
    )
    reference_apps.add_argument("--output", type=Path, required=True)
    reference_apps.set_defaults(handler=_reference_apps)
    for command in ("validate", "generate", "update"):
        command_parser = subparsers.add_parser(command)
        command_parser.add_argument("--config", type=Path, required=True)
        if command == "generate":
            command_parser.add_argument("--output", type=Path, required=True)
        if command == "update":
            command_parser.add_argument("--project", type=Path, required=True)
        command_parser.set_defaults(handler=getattr(_Handlers, command))
    return parser


class _Handlers:
    @staticmethod
    def validate(args: argparse.Namespace) -> int:
        resolved = _generator().validate(BlueprintConfig.from_yaml(args.config))
        print(json.dumps(_summary(resolved), indent=2, sort_keys=True))
        return 0

    @staticmethod
    def generate(args: argparse.Namespace) -> int:
        resolved = _generator().generate(BlueprintConfig.from_yaml(args.config), args.output)
        print(json.dumps(_summary(resolved), indent=2, sort_keys=True))
        return 0

    @staticmethod
    def update(args: argparse.Namespace) -> int:
        resolved = _generator().update(BlueprintConfig.from_yaml(args.config), args.project)
        print(json.dumps(_summary(resolved), indent=2, sort_keys=True))
        return 0


def _profiles(_args: argparse.Namespace) -> int:
    print(
        json.dumps(
            {
                name: {
                    "required_modules": sorted(PROFILES[name].required_modules),
                    "optional_modules": sorted(PROFILES[name].optional_modules),
                    "default_settings": PROFILES[name].default_settings,
                    "infrastructure": list(PROFILES[name].infrastructure),
                    "security_requirements": list(PROFILES[name].security_requirements),
                    "tests": list(PROFILES[name].tests),
                    "deployment": list(PROFILES[name].deployment_assumptions),
                }
                for name in sorted(PROFILES)
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


def _reference_apps(args: argparse.Namespace) -> int:
    report = generate_reference_apps(Path(__file__).resolve().parents[2], args.output)
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0


def _generator() -> BlueprintGenerator:
    return BlueprintGenerator(Path(__file__).resolve().parents[2])


def _summary(resolved) -> dict[str, object]:
    return {
        "profile": resolved.profile.name,
        "enabled_modules": sorted(resolved.enabled_modules),
        "required_capabilities": sorted(resolved.required_capabilities),
        "installed_disabled_capabilities": sorted(resolved.installed_disabled_capabilities),
        "optional_dependency_groups": sorted(resolved.optional_dependency_groups),
    }


def main() -> None:
    args = build_parser().parse_args()
    raise SystemExit(args.handler(args))


if __name__ == "__main__":
    main()
