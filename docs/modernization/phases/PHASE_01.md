# Phase 01 — Engineering quality, dependency modernization, and CI/CD

Status: `VERIFIED`

## Delivered

- Kept uv as the authoritative Python dependency and lockfile workflow; added the missing quality tools to both the development extra and uv dependency group.
- Added Ruff formatting/lint enforcement, Pyright with a checked-in basic-mode baseline, pytest-cov reporting, import-linter contracts, and pre-commit hooks.
- Fixed the typing defects exposed by the new Pyright gate across cache generics, repositories, Pydantic boundaries, optional providers, Redis, and RAG adapters. Pyright now reports zero errors without a global ignore policy.
- Added architecture contracts for domain independence and application/API independence.
- Added locked-action GitHub workflows for backend quality, PostgreSQL/Redis tests and migrations, security scans, and container validation. Existing frontend and API-contract workflows now use explicit read permissions, concurrency, and pinned action commits.
- Added Renovate configuration for uv, npm, and GitHub Actions updates.
- Added `langchain-community` to the RAG dependency definition because the existing optional loader adapter imports it.

## Testing strategy decision

The repository already has unit/application/API coverage and a disposable PostgreSQL/Redis browser workflow. Phase 01 uses GitHub service containers for database-backed validation instead of adding Testcontainers as a second orchestration layer. Hypothesis and Schemathesis remain follow-up candidates: no new behavior in this phase creates a justified property-based or generated-OpenAPI test surface, and adding them without cases would create dependency noise rather than coverage.

## Local gates

```sh
make check
make test
make coverage
make security-audit
cd frontend && npm run build
```

For read-only home caches, use writable task-local cache directories as documented in [local-validation.md](../../runbooks/local-validation.md). Docker-dependent migration, browser, and image checks are reproducible in GitHub Actions; they were not runnable in the audit environment because its Docker API was unavailable.

## Exit evidence

- Ruff check and format check: passed.
- Pyright: passed with `0 errors, 0 warnings, 0 informations`.
- Import-linter: two contracts kept, zero broken.
- Pre-commit pre-push hook set: passed.
- uv lock regenerated and `uv sync --locked` completed with the new tools and RAG loader dependency.
