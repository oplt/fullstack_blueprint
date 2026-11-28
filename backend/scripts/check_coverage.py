"""Enforce the application statement-coverage gate from a coverage.xml report.

Statement coverage and branch coverage measure different things. This gate
enforces the 80% policy on statement coverage only and reports branch coverage
separately, instead of letting coverage combine the two metrics into one number.
"""

from __future__ import annotations

import sys
import xml.etree.ElementTree as ET

STATEMENT_FAIL_UNDER = 0.80
EXPECTED_ARG_COUNT = 2


def main() -> int:
    if len(sys.argv) != EXPECTED_ARG_COUNT:
        print("usage: check_coverage.py <coverage.xml>", file=sys.stderr)
        return 2

    try:
        root = ET.parse(sys.argv[1]).getroot()
        line_rate = float(root.attrib["line-rate"])
        branch_rate = float(root.attrib.get("branch-rate", "0"))
        lines_covered = int(root.attrib.get("lines-covered", 0))
        lines_valid = int(root.attrib.get("lines-valid", 0))
    except (OSError, ET.ParseError, KeyError, ValueError) as exc:
        print(f"Failed to read coverage report {sys.argv[1]!r}: {exc}", file=sys.stderr)
        return 2

    print(f"Statement coverage: {line_rate:.2%} ({lines_covered}/{lines_valid} lines)")
    print(f"Branch coverage:    {branch_rate:.2%}")

    if line_rate < STATEMENT_FAIL_UNDER:
        print(
            f"FAIL: statement coverage {line_rate:.2%} is below {STATEMENT_FAIL_UNDER:.0%}",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
