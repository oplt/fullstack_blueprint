# Backend Agent Instructions

## Stack and Architecture

- Use the existing Python, FastAPI, Pydantic Settings, async SQLAlchemy, PostgreSQL/pgvector, Alembic, Redis and Celery stack.
- Maintain the modular monolith:
  - Routers handle HTTP.
  - Services coordinate use cases.
  - Repositories and ports define persistence and integration boundaries.
  - Infrastructure implements adapters.
- Keep domain features under backend/modules.
- Use api for composition, core/db/lib for shared infrastructure and workers for job entry points.
- Use backend.* imports, explicit typing and existing dependency injection.
- Avoid circular dependencies, internal cross-module imports and unnecessary layers for simple CRUD.

## Persistence and API

- Use request-scoped AsyncSession instances; never share sessions across concurrent tasks.
- Maintain explicit transaction boundaries, bounded pagination and parameterized queries.
- Avoid N+1 queries and partial writes.
- Separate persistence models from public API schemas.
- Use Pydantic validation and existing API error contracts.
- Register new models in alembic/env.py and routers in api/router.py.
- Create Alembic revisions for schema changes; never modify applied migrations.
- Preserve API compatibility unless breaking changes are authorized.

## Security and Reliability

- Enforce authentication, CSRF for cookie-authenticated writes, resource authorization and tenant isolation.
- Respect project owner/editor/viewer permissions.
- Validate ownership and membership in queries, ingestion, retrieval and background jobs.
- Never trust client-provided identity or permissions.
- Preserve typed settings, feature gates, structured logging and sanitized errors.
- Use retry-safe background jobs and enqueue after successful persistence where appropriate.

## AI, Agents, RAG and Memory

Apply this section only when changing AI-related functionality.

- Prefer deterministic logic when sufficient.
- Reuse existing generation ports, providers and adapters.
- Separate prompts, tools, orchestration, provider configuration and business rules.
- Validate structured outputs and streamed events.
- Use explicit tool allowlists, bounded execution and existing approval controls.
- Protect against prompt injection, unauthorized tool actions and cross-tenant data leakage.
- Preserve document authorization throughout ingestion, indexing and retrieval.
- Keep embedding dimensions and index metadata consistent; migrate or reindex explicitly when needed.
- Respect optional features and provider configuration.
- Evaluate affected AI behavior with representative failure and adversarial cases.
- Do not silently substitute mock or heuristic results for production behavior.

## Validation

Apply the global validation policy.

Available commands from the repository root:

- Targeted tests:
  backend/.venv/bin/python -m pytest <test-path>

- Lint changed Python files:
  backend/.venv/bin/ruff check <changed-paths>

- Check formatting:
  backend/.venv/bin/ruff format --check <changed-paths>

Run broader checks only when justified:

- make test-backend: broad backend changes.
- make check: cross-module or contract changes.
- Migration tests: schema or migration changes.
- Integration tests: affected authorization, tenancy, persistence or job behavior.

Use existing environments.
Do not start PostgreSQL, Redis, Celery or Docker services for tasks that do not require them.
Do not run live LLM evaluations for unrelated backend changes.