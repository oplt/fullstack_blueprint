# Dependency audit

Audit date: 2026-11-24. This record distinguishes installed/locked dependencies from checks that were not available.

## Package management and reproducibility

| Check | Result | Evidence |
| --- | --- | --- |
| Backend lock consistency | `VERIFIED` | `make backend-lock-check` / `uv lock --check` passed |
| Backend install | `VERIFIED` | `UV_CACHE_DIR=/tmp/... make setup` backend sync passed |
| Frontend install | `VERIFIED` | `NPM_CONFIG_CACHE=/tmp/... make setup` ran `npm ci` successfully |
| Frontend lockfile | `VERIFIED` | `npm ci` installed 810 packages from lockfile |
| Outdated dependency scan | `VERIFIED` with no candidates reported | `uv tree --outdated --depth 1` completed without output beyond resolution |
| Python vulnerability scan | `BLOCKED` | `pip-audit`, `trivy`, `grype`, and `osv-scanner` are not installed; no scanner was invented or installed during Phase 00 |

## Backend baseline

The backend declares broad compatible ranges in `backend/pyproject.toml` and pins resolved versions in `backend/uv.lock`. The lock contains FastAPI 0.135.3, Pydantic 2.12.5, SQLAlchemy 2.0.48, Alembic 1.18.4, asyncpg 0.31.0, pgvector 0.4.2, Redis 7.4.0, Celery 5.6.3, Uvicorn 0.42.0, HTTPX 0.28.1, Passlib 1.7.4, Sentry SDK 2.57.0, Prometheus client 0.25.0, and OpenTelemetry API 1.40.0.

No broad backend upgrade was applied. Before any upgrade, verify Python compatibility, provider SDK behavior, migration behavior, and lockfile synchronization.

## Frontend vulnerability scan

`cd frontend && npm audit --json` exited `1` with:

- 6 moderate vulnerabilities;
- 0 info, low, high, or critical findings;
- affected paths include `glob`, `minimatch`, `workbox-build`, `vite-plugin-pwa`, `@joshwooding/vite-plugin-react-docgen-typescript`, and `@storybook/react-vite`;
- npm reported no automatic fix for these paths.

`npm ci` also reported deprecated transitive packages: `whatwg-encoding@3.1.1`, `source-map@0.8.0-beta.0`, and `glob@11.1.0`.

## Actions

1. Keep the six moderate findings visible in CI; the existing `npm run audit` threshold is high, so a full audit is additionally required for release review.
2. Re-run npm audit after Storybook, PWA, or Vite upgrades and prefer compatible upstream fixes over `--force`.
3. Add a Python scanner in CI only after selecting a maintained tool and documenting its license, cache behavior, and lockfile input.
4. Do not add dependencies for architectural gaps until existing ports, SQLAlchemy, Redis, Celery, and standard-library options have been reviewed.

