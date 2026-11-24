# Contributing

Use the setup commands in [README.md](README.md). Run `make check`, `make test`, and the frontend validation commands below before opening a pull request. Run relevant Playwright coverage against a disposable instance for changes involving the browser.

Follow the projects module for feature structure. Route handlers call services, services use repositories and ports, and infrastructure owns external adapters. Add migrations for schema changes, and review generated migrations for custom constraints and indexes. Keep independent changes reviewable and update environment examples when settings change.

## Frontend workflow

Place API methods and generated contracts in `frontend/src/api`, centralized query keys in `frontend/src/config`, shared primitives in `frontend/src/components/ui`, and domain features in `frontend/src/features/<domain>`. Add a lazy route through `src/app/routes.ts` and `src/app/router.tsx`, use the capability configuration boundary, and provide loading, error, empty, keyboard, and translated states. Do not put credentials or server-only settings in `VITE_*` variables.

For a repeatable workflow, use the repository-local skills documented in [docs/frontend/AGENT_SKILLS.md](docs/frontend/AGENT_SKILLS.md), especially `frontend-feature`, `create-ui-component`, `create-data-table`, `create-form`, and `frontend-testing`.

```sh
cd frontend
npm run lint
npx tsc -b
npm test -- --run
npm run api:check
npm run storybook:build
npm run build
npm run perf:check
npm run pwa:check
```

Run `npm run test:e2e -- --project=chromium` only with disposable backend, database, Redis, and browser services. Classify checks as passed, failed, skipped, or infrastructure-blocked in review notes; never use production data for tests.
