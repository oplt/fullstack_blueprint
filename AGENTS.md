# Fullstack Blueprint contributor instructions

- Work in the modular monolith. Route handlers call services, services use repositories and ports, and infrastructure implements persistence and external adapters. Register SQLAlchemy models in Alembic and schema changes in a revision.
- Use request-scoped SQLAlchemy sessions and sequential statements within each session. Parallel tasks that need persistence should own separate sessions.
- Enforce access in the backend for every resource operation. Project access uses the owner/editor/viewer model. Keep document ownership and project membership checks at retrieval and indexing boundaries. RAG owns ingestion and stores each index revision.
- Keep secrets in local settings or deployment secret storage. Never print tokens, passwords, provider keys, or connection credentials. Protect cookie-authenticated writes with CSRF and keep auth/session checks active.
- Gate optional APIs and UI on server configuration. Reuse shared Material UI components, query keys, and loading/error/empty states. Keep tests for retained behavior.
- Use `make setup`, `make check`, `make test`, and `cd frontend && npm run build`. Verify schema changes against a disposable PostgreSQL database with pgvector using Alembic. Use isolated services for Playwright and live API tests.
- Preserve user changes and data. Never run destructive migration or volume commands against an existing environment. Keep the uv and npm lockfiles synchronized.
