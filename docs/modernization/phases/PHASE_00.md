# Phase 00 — Repository audit and architectural baseline

Status: `VERIFIED`  
Date: 2026-11-24

## Objective

Establish a verified understanding of the repository before modifying its architecture.

## Completed work

- Read and respected `AGENTS.md`, `README.md`, `CONTRIBUTING.md`, `docs/frontend/AGENT_SKILLS.md`, CI workflows, manifests, lockfiles, infrastructure, migrations, and backend modules.
- Verified the repository is a modular monolith with FastAPI, async SQLAlchemy, PostgreSQL/pgvector, Redis/Celery, optional AI/RAG/memory, project ACLs, platform capabilities, object storage, and observability.
- Counted 304 backend Python files, 46 backend test files, 123 API routes, 36 registered SQLAlchemy tables, 1 Alembic revision, and 350 frontend source TS/TSX files.
- Produced current and target diagrams, module boundary rules, technology inventory, security model, data model, dependency audit, risk register, migration strategy, backlog, and runbooks.
- No runtime behavior or dependency lockfile was changed.

## Validation matrix

| Command/check | Result | Notes |
| --- | --- | --- |
| `UV_CACHE_DIR=/tmp/... make setup` | `PASSED` | Backend `uv sync --locked` and frontend `npm ci`; temporary caches were required because home caches are read-only |
| `make check` | `PASSED` | Lock check, Ruff, ESLint, TypeScript, API contract, Ruff format check |
| `make test-backend` | `PASSED` | 219 passed, 4 skipped in 3.47s |
| `make test-frontend` | `PASSED` | 147 passed across 46 test files |
| `cd backend && .venv/bin/alembic check` | `PASSED` | No new upgrade operations detected |
| `cd backend && .venv/bin/alembic current/heads` | `PASSED` | Current and head are `0001_blueprint` |
| `docker compose ... config --quiet` | `PASSED` | Compose file parses |
| `cd frontend && npm run build` | `PASSED` | Vite 8 production build and PWA assets generated |
| `cd frontend && npm audit --json` | `FAILED AS SECURITY BASELINE` | 6 moderate, 0 high/critical; no automatic fix |
| `docker compose ... ps --all` | `BLOCKED` | Docker API permission denied |
| Disposable PostgreSQL/pgvector migration | `BLOCKED` | Requires Docker/service access; not run against an existing environment |
| Python dependency vulnerability audit | `BLOCKED` | No `pip-audit`, `trivy`, `grype`, or `osv-scanner` installed |

## Findings

### Architecture

- The intended modular shape exists and is testable.
- Two conservative static import cycles were found: session/observability and worker/task dispatch.
- Platform and AI service composition uses multiple inheritance.
- A subset of routers bypass service transaction ownership with direct SQL/commits.
- AI document compatibility routes delegate to RAG, but both vocabularies remain public.

### Security

- Authentication, session revocation, CSRF, rate limits, admin checks, project ACLs, logging redaction, and optional-feature gating are present.
- Webhook validation has a DNS-rebinding window and needs a pinned egress policy.
- MFA and webhook signing secrets are stored plaintext at rest.
- External webhook errors should be normalized before returning to clients.

### Data and persistence

- 36 tables have foreign keys and indexes for the primary ownership paths; pgvector and FTS indexes are present.
- Subscription cardinality is application-enforced but not database-enforced.
- RAG/memory project references and organization fields are intentionally loose strings today.
- The baseline migration refuses non-empty schemas and has no destructive downgrade.

## Acceptance criteria

- [x] Repository assumptions verified against source.
- [x] Baseline commands executed and results recorded, including failures/blockers.
- [x] Current and target architecture documented with diagrams.
- [x] Module dependency graph and boundary rules documented.
- [x] Dependency audit, technical debt/backlog, risk register, and migration strategy documented.
- [x] Persistent phase/status/runbook system created.
- [x] Exact next implementation task recorded: `P0-SEC-01`, fix webhook SSRF/DNS-rebinding exposure and define the egress policy.

