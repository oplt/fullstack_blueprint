# Project Agent Instructions

## Architecture

- This repository is a reusable modular FastAPI/React monolith.
- Preserve optional AI, agents, RAG, memory and calendar capabilities.
- Use backend/modules/projects and the task CRUD flow as references for new domain features.
- The backend owns business rules, authorization and API contracts.
- Projects and memberships define tenancy boundaries.
- Preserve optional feature gates across API, UI, routes and background operations.
- Do not introduce competing frameworks, persistence layers or services without a concrete need.

## Scope

- Follow applicable nested AGENTS.md instructions.
- Load backend/AGENTS.md only for backend work and frontend/AGENTS.md only for frontend work.
- For cross-stack changes, apply both.
- Consult architecture documentation only when changing architectural boundaries.
- Read manifests, lockfiles and CI configuration only when relevant to the task.
- Preserve the reusable template structure and supported deployment configurations.

## Contracts and Dependencies

- Keep backend schemas and frontend API consumers synchronized.
- When OpenAPI contracts change, run from frontend/:
  - npm run api:generate:all
  - npm run api:check
- Use uv and npm with their existing lockfiles.
- Synchronize backend dependency exports when dependencies change.
- Do not perform unrelated dependency upgrades.

## Commands

Use these commands according to the global validation policy:

- make setup: environment provisioning.
- make check: broad static and contract validation.
- make test: full project test suite.
- make test-backend: backend test suite.
- cd frontend && npm run build: production frontend build.

These commands are available tools, not mandatory steps for every task.

Prefer existing environments and targeted checks.
Do not reinstall dependencies when the environment already works.

## Data and Infrastructure

- Preserve existing data, migration history and development environments.
- Never reset databases or remove Docker volumes without explicit authorization.
- Use disposable PostgreSQL/pgvector and supporting services for migration and integration tests.
