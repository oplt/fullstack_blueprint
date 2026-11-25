# Backend agent instructions

## Stack and architecture
- Use the installed Python, FastAPI, Pydantic Settings, async SQLAlchemy, PostgreSQL/pgvector, Alembic, Redis and Celery stack. Follow `pyproject.toml`, `uv.lock` and repository conventions.
- Maintain a modular monolith: routers handle HTTP; services coordinate use cases; repositories/ports abstract persistence and integrations; infrastructure implements adapters.
- Keep domain/application logic independent of HTTP, ORM and provider details where existing boundaries permit. Avoid adding layers to trivial CRUD without a reason.
- Place domain features under `backend/modules`; use `api` for composition, `core`, `db`, and `lib` for genuinely shared infrastructure, and `workers` for job entry points.
- Use `backend.*` imports, explicit type annotations and existing dependency injection. Avoid circular dependencies, module-internal imports across feature boundaries and catch-all helpers.
- Reuse existing schemas, repositories, ports, services and error handling before adding another implementation. Extract shared code only when ownership and semantics align.

## Persistence and API
- Use request-scoped AsyncSession instances; do not share a session across concurrent tasks. Parallel persistence tasks must own separate sessions.
- Define clear transaction boundaries; prevent partial writes and N+1 queries. Use bounded pagination and parameterized queries.
- Keep persistence models distinct from public request/response schemas. Validate inputs with Pydantic and use established API error contracts.
- Register new SQLAlchemy models in `alembic/env.py`, routers in `api/router.py`, and schema changes in an Alembic revision.
- Do not edit applied migrations; test upgrade and schema consistency with disposable PostgreSQL/pgvector. Preserve compatibility or document authorized breaking changes.
- Keep OpenAPI contracts synchronized with all consumers and validators.

## Security and reliability
- Enforce authentication, CSRF on cookie-authenticated writes, and resource authorization server-side for every operation; honor project owner/editor/viewer roles and tenant boundaries.
- Validate resource ownership and project membership in queries, retrieval, ingestion and background operations. Never trust client-supplied identity or permissions.
- Centralize typed settings and feature gates; protect secrets and PII in logs, prompts and traces.
- Use existing job/queue conventions; make side effects retry-safe and enqueue after successful persistence when appropriate. Add bounded retries/timeouts and idempotency where warranted.
- Preserve structured logging, observability and sanitized errors; never swallow failures or add silent fallbacks.

## AI, agents, RAG and memory
- Prefer deterministic logic over LLM calls when sufficient. Keep provider adapters, prompts, model configuration, tool definitions, orchestration and business rules separate.
- Reuse existing generation ports and adapters; validate structured outputs and streamed events. Use explicit tool allowlists, least privilege, approval controls and bounded execution.
- Treat user/retrieved content as untrusted; prevent prompt injection, cross-tenant leakage and unauthorized tool actions.
- RAG owns document ingestion and index revisions; enforce document access at ingestion, indexing and retrieval. Keep embedding dimensions and index metadata consistent; migrate/reindex explicitly if they change.
- Respect optional feature flags, provider configuration and disabled-feature behavior. Do not silently substitute heuristic or mock output for production results.
- Evaluate meaningful AI changes with representative cases, including failures and adversarial inputs; monitor latency, token cost and retrieval quality without logging sensitive content.

## Checks
- From repository root: `make test-backend`; run targeted pytest tests using `backend/.venv/bin/python -m pytest <path>`.
- Run `backend/.venv/bin/ruff check backend` and `backend/.venv/bin/ruff format --check backend`; use `make check` for broader changes.
- Verify authorization, tenant isolation, transactions, job retries and API compatibility when affected; use real disposable infrastructure for integration coverage.
