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
    "MEMORY_ENABLED",
    "RAG_ENABLED",
    "CALENDAR_ENABLED",
    "OBSERVABILITY_ENABLED",
)


def export_contract(output: Path) -> None:
    for flag in OPTIONAL_FLAGS:
        os.environ[flag] = "true"

    from backend.api.main import app

    contract = app.openapi()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(contract, indent=2, sort_keys=True, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    export_contract(args.output)


if __name__ == "__main__":
    main()
