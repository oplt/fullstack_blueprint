# Technology stack

This is an observed baseline inventory, not a recommendation to upgrade every dependency.

## Runtime and package management

| Concern | Current choice | Evidence / policy |
| --- | --- | --- |
| Backend language | Python 3.12+; audit host Python 3.14.4 | `backend/pyproject.toml` |
| Backend package manager | uv, locked by `backend/uv.lock` | `make setup`, `make backend-lock-check` |
| Frontend runtime | Node >=22.13.0; audit host Node 24.22.3 | `frontend/package.json` |
| Frontend package manager | npm with `frontend/package-lock.json` | `npm ci` |
| Formatting/lint | Ruff 0.16.6 observed; ESLint 10.15.0 locked | `Makefile`, frontend scripts |
| API contract | FastAPI OpenAPI export and generated frontend contract | `frontend/src/api/generated`, `npm run api:check` |

## Backend locked versions observed

| Package | Locked version |
| --- | ---: |
| FastAPI | 0.135.3 |
| Pydantic | 2.12.5 |
| Pydantic Settings | 2.13.1 |
| SQLAlchemy | 2.0.48 |
| asyncpg | 0.31.0 |
| Alembic | 1.18.4 |
| pgvector | 0.4.2 |
| Redis client | 7.4.0 |
| Celery | 5.6.3 |
| Uvicorn | 0.42.0 |
| HTTPX | 0.28.1 |
| Passlib | 1.7.4 |
| Sentry SDK | 2.57.0 |
| Prometheus client | 0.25.0 |
| OpenTelemetry API | 1.40.0 |

The project declares compatible ranges in `pyproject.toml`; `uv.lock` is authoritative for reproducible installs. The audit did not perform a broad upgrade. `uv tree --outdated --depth 1` completed without reporting candidates.

## Data and infrastructure

- PostgreSQL is the relational system of record.
- pgvector is created by the baseline migration and supports a 1536-dimensional vector column with cosine HNSW indexing.
- PostgreSQL full-text search uses a generated `tsvector` and GIN index for RAG chunks.
- Redis provides cache, rate-limit, token, and Celery broker/result services.
- Celery runs email, RAG indexing/cleanup, AI evaluation, and memory extraction jobs.
- S3-compatible storage is optional and accessed through the object-storage adapter.
- Docker Compose provides local PostgreSQL/pgvector, Redis, optional Mailpit, and optional MinIO.

## AI and retrieval

- AI provider abstraction supports a local heuristic provider for development and HTTP adapters for OpenAI/Anthropic-compatible generation.
- AI Studio persists prompt templates, versions, runs, reviews, feedback, datasets, evaluation cases, and evaluation runs.
- RAG owns upload, parsing, chunking, embedding, retrieval, citation validation, and index revisions.
- Mem0 is optional and is accessed only through `MemoryService`/`Mem0Client`; local Postgres stores audit and registry references.

## Observability

- Prometheus metrics and FastAPI request metrics are available when enabled.
- OpenTelemetry traces/metrics are configuration-gated.
- Sentry is independently enabled by `SENTRY_DSN`.
- Grafana/Tempo/Prometheus configuration is supplied under `observability/`.

## Dependency findings

- Frontend `npm audit --json` reports 6 moderate vulnerabilities in the Storybook/docgen and Workbox/glob/minimatch dependency paths. No high or critical vulnerabilities were reported; no automatic upgrade was applied.
- `npm ci` reports deprecated transitive packages (`whatwg-encoding`, `source-map` beta, and `glob`). These are tracked in the dependency audit.
- Docker cannot be reached from the current execution environment, so image pulls/builds and service-level compatibility were not validated in Phase 00.

