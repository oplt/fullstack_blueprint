"""Validate an exported OpenAPI document against the OpenAPI specification."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from openapi_spec_validator import validate


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    args = parser.parse_args()
    document = json.loads(args.input.read_text(encoding="utf-8"))
    validate(document)
    print(f"OpenAPI document is valid: {args.input}")


if __name__ == "__main__":
    main()
