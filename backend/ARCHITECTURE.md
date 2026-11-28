# Backend architecture rules

The backend is a modular monolith. HTTP adapters compose use cases; business
modules own domain behavior; core owns shared technical infrastructure.

## Naming

Use `router.py`, `service.py`, `repository.py`, `models.py`, `schemas.py`,
`policies.py`, `permissions.py`, and `jobs.py` only when the file has that
single responsibility. Python files and functions use `snake_case`.

`base_service.py` and `providers/common.py` are retained exceptions: the
former contains the shared AI service contract and the latter contains shared
provider behavior. They must not become general-purpose dumping grounds.

## Dependency direction

- Routers call services and public module interfaces.
- Services coordinate repositories and business rules.
- Repositories own persistence operations.
- Business modules may depend on `backend.core`.
- Workers call public services or task entry points.
- Core must not import business modules.
- Repositories must not import routers.
- Infrastructure must not import application layers.
- Production code must not import tests or offline evaluation runners.

Composition roots such as `backend.api.main`, `backend.api.router`, migrations, and
worker registration may wire modules explicitly. Cross-module private
repositories remain prohibited; expose a service or public port instead.

`modules/agents/router.py` currently has one known persistence exception from
the in-progress agent-workflow reorganization. The architecture checker keeps
reporting it and fails on any new violation; move that operation into the
workflow service when that module migration is completed.

Shared telemetry and health probes live in `core/observability`. The API owns the
authenticated observability routes and OpenAPI construction. See the
[core migration decisions](../docs/architecture/core-decisions.md).

## Review thresholds

Prefer source paths of four levels or fewer and ordinary modules of 5–15
implementation files. Review folders with only one or two files, files over
approximately 600 lines, and functions over approximately 50–70 lines.
These are review signals, not automatic failures.

## Checks

Run the existing checks from `backend/`:

```text
backend/.venv/bin/python scripts/check_architecture.py
backend/.venv/bin/lint-imports pyproject.toml --no-cache
```

The route checker reports direct persistence in routers and the import-linter
enforces package-level contracts. Both are required for new architecture work.
