# Phase 11 final validation runbook

## Scope

This runbook validates generated applications, not real customer data or paid
providers. Use mock/local AI providers, disposable PostgreSQL/pgvector and Redis,
and isolated Compose project names. Do not create financial transactions or call
paid AI APIs during this validation.

## Automated checks

```bash
make phase11-check
backend/.venv/bin/pytest backend/blueprint/tests -q
UV_CACHE_DIR=/tmp/fullstack-blueprint-uv-cache make check
make test
cd frontend && npm run build
```

The generator report is written as `reference-applications.json` in the external
output directory. It records selected capabilities, forbidden capabilities, and
optional dependency groups for all three fixtures.

## Disposable environment checks

For each fixture, install the locked backend dependencies, run `docker compose config`,
build `api` and `worker` with the generated `UV_EXTRAS` groups, start PostgreSQL and Redis, apply `alembic upgrade head`,
start the API and worker, then verify `/health/live` and `/health/ready`. Create a
disposable user, organization, billing-plan selection, entitlement lookup, and
project through the cookie/CSRF-protected API. Run the fixture's backend tests and
generated OpenAPI validation before removing its Compose project and volumes.

The current execution environment has no Docker daemon, so these runtime, migration,
health, and image checks are delegated to the Phase 11 CI workflow and remain an open
release gate locally.

## Review checklist

- Architecture: generated projects retain route/service/repository boundaries.
- Security: no `.env` credentials are copied; cookie writes, CSRF, authorization,
  tenant checks, and provider allowlists remain server-side.
- Dependencies: each generated backend passes `uv lock --check` and can run a locked
  `uv sync --all-extras`.
- Migrations: historical revisions are preserved and the generated manifest records
  head `0007_organizations`.
- API: runtime OpenAPI remains deterministic and generated Compose files point at the
  generated environment and repository infrastructure paths.
- AI: fixtures use local/mock provider settings and retain budgets, approvals,
  idempotency, retries, and audit boundaries.
- Tenant isolation: existing backend authorization and isolation tests remain required;
  the generator does not bypass them.
- Documentation: provider-neutral billing, no-cost mock providers, and any
  product-specific quota requirements are explicit rather than implied.
