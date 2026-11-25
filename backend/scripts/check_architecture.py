"""Reject persistence and repository access from HTTP route adapters."""

from __future__ import annotations

import ast
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"
ROUTE_PATTERNS = {"router.py", "_router.py", "routes.py", "_routes.py"}
FORBIDDEN_IMPORT_PARTS = (".repository",)
FORBIDDEN_SQL_NAMES = {"select", "insert", "update", "delete", "text"}
FORBIDDEN_SESSION_METHODS = {
    "add",
    "commit",
    "delete",
    "execute",
    "flush",
    "rollback",
    "scalar",
}


def route_files() -> list[Path]:
    return sorted(
        path
        for path in (BACKEND / "modules").rglob("*.py")
        if path.name in ROUTE_PATTERNS or path.name.endswith("_routes.py")
    )


def check_file(path: Path) -> list[str]:
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    violations: list[str] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom):
            module = node.module or ""
            if any(part in module for part in FORBIDDEN_IMPORT_PARTS):
                violations.append(f"{path.relative_to(ROOT)}:{node.lineno}: imports {module}")
            if module == "sqlalchemy" and any(
                alias.name in FORBIDDEN_SQL_NAMES for alias in node.names
            ):
                violations.append(f"{path.relative_to(ROOT)}:{node.lineno}: imports SQL expression")
        elif isinstance(node, ast.Import):
            for alias in node.names:
                if any(part in alias.name for part in FORBIDDEN_IMPORT_PARTS):
                    violations.append(
                        f"{path.relative_to(ROOT)}:{node.lineno}: imports {alias.name}"
                    )
        elif (
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Attribute)
            and (
                isinstance(node.func.value, ast.Name)
                and node.func.value.id in {"db", "session"}
                and node.func.attr in FORBIDDEN_SESSION_METHODS
            )
        ):
            violations.append(f"{path.relative_to(ROOT)}:{node.lineno}: direct session operation")
    return violations


def main() -> int:
    files = route_files()
    violations = [violation for path in files for violation in check_file(path)]
    if violations:
        print("Route boundary violations detected:")
        print("\n".join(violations))
        return 1
    print(f"Route boundary check passed ({len(files)} route adapters)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
