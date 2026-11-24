# Testing and CI/CD

The frontend validation workflow is `.github/workflows/frontend-validation.yml`. The existing API contract workflow remains separate so generated contract drift is visible on its own check.

## Checks

| Job/check | Scope | Environment |
| --- | --- | --- |
| Frontend static | `npm ci`, audit, ESLint, TypeScript, API contract, Vitest unit/component, axe tests, production build, PWA artifact, bundle budgets, Storybook build | Locked npm/uv dependencies; no live backend |
| Backend | Locked uv install, Ruff check/format, pytest and JUnit report | No production data; repository test fixtures |
| Disposable browser | Alembic migrations, FastAPI, PostgreSQL with pgvector, Redis, Chromium Playwright journeys, production PWA browser probe | Ephemeral GitHub Actions services |

The browser configuration runs core registration/login/logout, refresh, protected-route, mobile navigation, theme, project and profile journeys. Provisioned-admin and AI/RAG tests remain explicitly skipped unless credentials and optional storage/model services are present. The same suite includes calendar, notifications, platform, feature-flag, agent, RAG, memory and observability coverage through unit/integration tests and provisioned E2E cases where configured.

## Local commands

```sh
make test
cd frontend
npm run lint
npx tsc -b
npm run api:check
npm run build
npm run pwa:check
npm run perf:check
npm run storybook:build
npm run test:e2e -- --project=chromium
```

For browser integration, use a disposable PostgreSQL/pgvector and Redis stack, apply Alembic migrations, start the API, and set `E2E_API_URL`, `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD`, and optional admin/AI variables. Never point these tests at production databases or customer data.

## Result classification

- Passed means the command actually completed successfully.
- Failed means a command or assertion failed and blocks the relevant workflow job.
- Skipped means a test is intentionally gated by missing optional credentials or services; it is visible in the Playwright/pytest report.
- Blocked means infrastructure could not be provisioned or a required external service was unavailable. The workflow summary records the condition and does not count it as a pass.
