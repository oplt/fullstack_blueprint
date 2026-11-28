"""Enforce backend layering and reject persistence from HTTP route adapters."""

from __future__ import annotations

import ast
import re
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
KNOWN_ROUTE_BOUNDARY_EXCEPTIONS: set[str] = set()
PYTHON_MODULE_NAME = re.compile(r"^[a-z][a-z0-9_]*\.py$")


def _is_test_or_offline_path(path: Path) -> bool:
    relative = path.relative_to(BACKEND).parts
    return "tests" in relative or ("modules" in relative and "eval" in relative)


def dependency_boundary_violations(path: Path) -> list[str]:  # noqa: C901
    """Return import violations for a production module file."""
    if _is_test_or_offline_path(path):
        return []
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    relative = path.relative_to(BACKEND).parts
    violations: list[str] = []

    def check_import(module: str, lineno: int) -> None:
        if not module:
            return
        if relative[0] == "core" and module.startswith("backend.modules"):
            violations.append(
                f"{path.relative_to(ROOT)}:{lineno}: core imports business module {module}"
            )
        if module.startswith("backend.tests") or module.startswith("backend.modules.rag.eval"):
            violations.append(
                f"{path.relative_to(ROOT)}:{lineno}: production code imports "
                f"test/eval module {module}"
            )
        if relative[-1] == "repository.py" and module.endswith(".router"):
            violations.append(
                f"{path.relative_to(ROOT)}:{lineno}: repository imports router {module}"
            )
        if "infrastructure" in relative and ".application" in module:
            violations.append(
                f"{path.relative_to(ROOT)}:{lineno}: infrastructure imports application {module}"
            )

    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom):
            check_import(node.module or "", node.lineno)
        elif isinstance(node, ast.Import):
            for alias in node.names:
                check_import(alias.name, node.lineno)
    return violations


def naming_violations(path: Path) -> list[str]:
    if path.name == "__init__.py" or PYTHON_MODULE_NAME.fullmatch(path.name):
        return []
    return [f"{path.relative_to(ROOT)}: filename is not snake_case"]


def route_files() -> list[Path]:
    module_routes = (
        path
        for path in (BACKEND / "modules").rglob("*.py")
        if path.name in ROUTE_PATTERNS or path.name.endswith("_routes.py")
    )
    return sorted([*module_routes, BACKEND / "api" / "observability.py"])


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
            violations.extend(
                f"{path.relative_to(ROOT)}:{node.lineno}: imports {alias.name}"
                for alias in node.names
                if any(part in alias.name for part in FORBIDDEN_IMPORT_PARTS)
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
    production_files = sorted(
        path for path in (BACKEND / "modules").rglob("*.py") if not _is_test_or_offline_path(path)
    )
    violations = [
        violation for path in production_files for violation in dependency_boundary_violations(path)
    ]
    violations.extend(
        violation for path in production_files for violation in naming_violations(path)
    )
    route_violations = [violation for path in files for violation in check_file(path)]
    known = [
        violation
        for violation in route_violations
        if any(violation.startswith(path + ":") for path in KNOWN_ROUTE_BOUNDARY_EXCEPTIONS)
    ]
    if known:
        print("Known route boundary exceptions:")
        print("\n".join(known))
    violations.extend(
        violation
        for violation in route_violations
        if not any(violation.startswith(path + ":") for path in KNOWN_ROUTE_BOUNDARY_EXCEPTIONS)
    )
    if violations:
        print("Route boundary violations detected:")
        print("\n".join(violations))
        return 1
    print(f"Route boundary check passed ({len(files)} route adapters)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
