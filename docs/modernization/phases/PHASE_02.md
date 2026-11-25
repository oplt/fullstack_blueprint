# Phase 02 — Backend architecture, module boundaries, and API contracts

Status: `VERIFIED`

## Delivered

- Added an explicit capability registry at `backend/modules/capabilities/registry.py`.
  Each capability declares dependencies, configuration requirements, router ownership,
  permissions, workers, database dependencies, integrations, health checks, and default
  flags. Build inclusion, deployment configuration, runtime module packs, tenant settings,
  user permissions, and subscription entitlements remain separate concepts. Capability
  metadata never grants authorization.
- Added a route-boundary AST check and extended import-linter coverage. HTTP adapters no
  longer import repositories or perform direct SQL/session persistence operations. Admin,
  notifications, settings, and platform write routes now delegate persistence to services.
- Added `backend/db/transaction.py` with an explicit transaction context and transaction
  owner contract. Repositories flush; application services own save/rollback boundaries.
- Added RFC 9457-compatible Problem Details responses while retaining the legacy `detail`,
  `errors`, and correlation ID fields consumed by the current frontend.
- Standardized reusable cursor pagination, URL-safe cursors, and a validated
  `Idempotency-Key` dependency for commands that opt into replay semantics. Existing offset
  pagination and `/api/v1` versioning remain unchanged.
- Added deterministic OpenAPI construction with stable operation IDs, explicit cookie/CSRF
  security schemes, contract version metadata, and `all`/`runtime` export profiles.
  `frontend/src/api/generated` was regenerated and `npm run api:check` passes.
- Added a PostgreSQL transactional outbox with versioned event envelopes, dedupe keys,
  row-lock claiming, exponential retry, dead-letter state, durable consumer receipts, and
  a Celery delivery task. Admin user-status changes persist their business update, audit
  record, and event in one transaction.
- Registered all new SQLAlchemy models with Alembic and added reversible revision
  `0002_outbox`.

## API contract policy

The committed frontend contract is the all-feature profile:

```sh
cd frontend
npm run api:generate:all
npm run api:check
```

Deployment-specific documentation can be exported without enabling optional routers:

```sh
backend/.venv/bin/python backend/scripts/export_openapi.py \
  --profile runtime --output /tmp/runtime-openapi.json
```

Cookie authentication and CSRF remain deployment/runtime behavior. Generated clients must
continue to use the existing credentialed transport and refresh/CSRF adapters; this phase
does not migrate frontend request code.

## Transaction and event rules

- A request or worker owns one SQLAlchemy session and executes statements sequentially.
- Repositories do not commit. A service or explicit transaction context commits once after
  business data, audit data, and outbox rows are ready.
- Outbox handlers receive versioned event IDs. Database consumers should write their
  receipt in the same transaction as their side effect; external consumers must pass the
  event ID as their provider idempotency key.
- Unknown or repeatedly failing events are retained and move to `dead_letter`; they are
  never silently dropped. Celery is reused; no new broker was introduced.

## Verification

- Ruff, formatting, and Pyright: passed.
- Import-linter: three contracts kept, zero broken.
- Route boundary scanner: 24 route adapters passed.
- Backend contract tests: 8 passed.
- Frontend OpenAPI contract: up to date.
- Migration metadata/model registration: verified; disposable PostgreSQL execution remains
  a CI/service-container check when Docker is available.

## Follow-up

- Phase 03 will remove the remaining documented service inheritance/cycle exceptions and
  replace compatibility imports with narrow ports.
- Phase 04 will validate additional data-integrity constraints and migration behavior on
  disposable pgvector PostgreSQL.
