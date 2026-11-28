"""Export the complete, deterministic OpenAPI contract used by the frontend.

The contract profile enables every optional router before importing the FastAPI
application. This keeps generated types stable across developer machines while
the runtime still gates those routers from deployment settings.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

OPTIONAL_FLAGS = (
    "AI_ENABLED",
    "AI_MCP_ENABLED",
    "MEMORY_ENABLED",
    "RAG_ENABLED",
    "CALENDAR_ENABLED",
    "OBSERVABILITY_ENABLED",
    "PROJECTS_ENABLED",
    "ORGANIZATIONS_ENABLED",
    "PLATFORM_API_ENABLED",
    "NOTIFICATIONS_ENABLED",
    "SETTINGS_API_ENABLED",
    "ADMIN_API_ENABLED",
)

CONTRACT_PROFILES = {"all", "runtime"}


def export_contract(output: Path, *, profile: str = "all") -> None:
    if profile not in CONTRACT_PROFILES:
        raise ValueError(f"Unknown contract profile: {profile}")
    if profile == "all":
        for flag in OPTIONAL_FLAGS:
            os.environ[flag] = "true"

    from backend.api.main import app  # noqa: PLC0415 - must follow env setup
    from backend.api.openapi import build_openapi  # noqa: PLC0415 - must follow env setup

    contract = build_openapi(app)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(contract, indent=2, sort_keys=True, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument(
        "--profile",
        choices=sorted(CONTRACT_PROFILES),
        default="all",
        help="all enables every optional capability; runtime uses deployment settings",
    )
    args = parser.parse_args()
    export_contract(args.output, profile=args.profile)


if __name__ == "__main__":
    main()
