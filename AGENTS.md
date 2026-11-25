# Project agent instructions

## Project context and workflow
- Read README, contribution guidance, architecture documentation, manifests, lockfiles and relevant tests before changing unfamiliar areas.
- Keep this file focused on project-wide rules. Before editing a directory, read its applicable nested AGENTS.md files, even when the session starts at the repository root.
- Follow existing architectural boundaries and ownership. Do not introduce another framework, service, persistence layer or dependency without a concrete need.
- Implement features as cohesive vertical changes, including authorization, validation, contracts, UI, tests and documentation where applicable.
- Prefer established project commands; inspect manifests and CI before inventing new commands. Use isolated development/test environments.
- Keep lockfiles, generated artifacts, example configuration and relevant documentation synchronized with changes.
- Run existing duplication and complexity checks when available. Do not increase avoidable duplication or bypass CI quality gates.
- Document significant architecture decisions using the project's established conventions.

## Fullstack Blueprint profile
This section is specific to fullstack_blueprint. Remove or adapt it when using this file in another project.

- The application is a modular FastAPI/React monolith; preserve its reusable blueprint character and optional AI, RAG, memory and calendar boundaries.
- Backend guidance: `backend/AGENTS.md`; frontend guidance: `frontend/AGENTS.md`. Read both for cross-stack work.
- Use `backend/modules/projects` and the task CRUD flow as the reference for new domain features.
- The backend owns business rules, authorization and API contracts. Projects and memberships are tenancy boundaries; preserve them for dependent integrations.
- Keep optional APIs and UI aligned with server configuration; disabled features must not remain accessible through direct routes or requests.
- For API changes, update backend schemas and regenerate frontend OpenAPI artifacts using `cd frontend && npm run api:generate:all`; verify with `npm run api:check`.
- Preserve data, migration history and development environments. Never reset an existing database or remove Docker volumes without explicit authorization.
- Use uv and npm lockfiles as authoritative. Keep backend dependency exports synchronized when dependencies change.
- Use `make setup` for provisioning, `make check` for static/contract checks, `make test` for tests and `cd frontend && npm run build` for the production frontend build.
- For substantial cross-stack changes run all applicable gates; for scoped changes use relevant targeted tests first. Use disposable PostgreSQL/pgvector and services for migrations, live API and Playwright tests.
