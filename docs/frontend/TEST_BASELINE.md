# Frontend test baseline

Measured on 2026-11-24 from `3271ffb` before application changes. Linux x64, Node 24.22.3, npm 11.19.1 and Python 3.14.4. These runs establish the baseline for migration regressions.

## Commands and results

| Check | Actual result |
| --- | --- |
| `make setup` | Passed with writable npm and uv caches. Locked backend sync and frontend `npm ci` succeeded. Audit and deprecation findings are in [the dependency matrix](DEPENDENCY_MATRIX.md). |
| `make check` | Passed after setup. Backend lock current, Ruff lint and formatting passed, frontend ESLint reported 0 errors and 0 warnings, and `tsc -b` reported 0 errors. |
| `make test`, default | Passed. Vitest 3.2.7 ran 107 tests in 27 files. Pytest ran 219 passed and 4 skipped. |
| `BLUEPRINT_TEST_API_URL=<isolated API>/api/v1 make test` | Passed. Vitest again ran 107 passing tests. Pytest ran 220 passed and 3 skipped, including a pass for the live project/task, membership, admin boundary and CSRF test. |
| `cd frontend && npm run test:coverage` | Passed all 107 tests. V8 report totals were 30.54% statements, 58.60% branches, 35.47% functions and 30.54% lines. |
| `cd frontend && npm run build` | Passed type checking, Vite build and service-worker generation. See [artifact sizes and timings](PERFORMANCE_BASELINE.md). |
| Alembic and API readiness | Upgrade and current succeeded at `0001_blueprint (head)` on disposable PostgreSQL 18.6 with pgvector 0.8.1. The core API readiness probe returned 200. |
| Browser automation | All 12 test cases passed in each of the 3 configured engines across complementary core and optional runs. See the profile split below. |

The default backend test run skips one live project test when `BLUEPRINT_TEST_API_URL` is absent. Three parser adapter tests remained skipped with the default backend extras because PyMuPDF was absent. The host's default uv cache was read-only. An early check during `npm ci` also resolved the host ESLint because the local binary was being replaced. The completed locked setup and check succeeded with the correct ESLint 9.39.4 and a writable cache. These were setup conditions. A final check after coverage generation also passed with zero lint errors and three warnings from generated `coverage/lcov-report/*.js`. The repository ESLint ignore list currently excludes `dist` and includes generated coverage output in linting.

## Playwright 1.61.0

| Browser | Core profile | AI/RAG profile |
| --- | --- | --- |
| Chromium 149 | 10 passed, 2 opt-in skips | 2 passed |
| Firefox 151 | 10 passed, 2 opt-in skips | 2 passed |
| WebKit 26.5 | 10 passed, 2 opt-in skips | 2 passed |
| Total across profiles | 30 passed, 6 profile skips | 6 passed |

Core exercises signed-out redirects and sign-in controls, registration, login, refresh, theme action, mobile navigation, project creation, disabled AI and admin guards, logout, plus provisioned standard/admin landing routes. The AI/RAG profile exercises text ingestion in AI Studio and indexing, retrieval and local agent completion through the API. These two cases are intentionally selected separately because the core flow asserts that AI is disabled. An initial Firefox launch timed out with unwritable cache paths. The isolated retry supplied writable XDG cache and configuration directories. WebKit launches initially failed with missing host libraries. Ubuntu packages were extracted under the temporary browser directory and its launcher was adjusted to honor that library path. Final per-engine runs passed. These setup failures occurred before application assertions.

Reproduce with the existing Playwright specs and two disposable configurations. Run a fresh PostgreSQL cluster and Redis instance, apply Alembic, set eager workers and test rate limits, and keep backend and browser settings outside the repository. Set `E2E_BASE_URL`, `E2E_API_URL` and `BACKEND_PROXY_TARGET` to matching isolated ports. Provision a regular user and an admin per the README and pass credentials by environment. Run `npm run test:e2e -- --project=<engine>` on the core stack. For AI/RAG enable the modules, configure a disposable S3-compatible bucket, install the storage dependency extra, select local AI and embeddings, set `E2E_AI_RAG=1`, and filter for `authenticated AI flow`. The baseline used a local Moto S3 endpoint and no external model credentials. Pass one worker when sharing the disposable API.

## Accessibility and responsive probes

axe-core 4.14.1 in Chromium against production preview, default light theme, 390 and 1280 px widths. Checked WCAG 2.0–2.2 A/AA rule tags selected by axe. The signed-out auth entry and provisioned user routes were sampled after content rendered. Counts below are affected nodes by rule, not counts of unique root causes.

| Route | 390 px | 1280 px |
| --- | --- | --- |
| `/` | 0 violations, 3 contrast nodes for manual review | Same |
| `/dashboard` | 6 contrast failures, 10 contrast nodes for manual review, horizontal document overflow | 7 contrast failures, 10 contrast nodes for manual review, one name mismatch and one list semantics failure |
| `/projects` | 0 violations, 1 contrast node for manual review | One contrast failure, one name mismatch and one list semantics failure |
| `/profile` | One contrast failure, 8 contrast nodes for manual review | Two contrast failures, 8 contrast nodes for manual review, one name mismatch and one list semantics failure |

Dashboard status colors measured 4.04:1 and 3.14:1 on white for normal 14 px text. Calendar states measured as low as 1.2:1. White avatar initials on gray measured 1.87:1. The desktop shell has a visible label omitted from the accessible name and anchor elements as direct children of a list. The dashboard skip link transferred keyboard focus to `#main-content` at both widths. Lighthouse also flagged heading order and lack of a main landmark on the auth entry. See [Lighthouse results](PERFORMANCE_BASELINE.md#production-preview-lighthouse).

The existing jsdom accessibility/responsive tests cover skip links, status text and live feedback, disclosure IDs, tooltip/disabled explanations, tab semantics, and layout configuration. Browser probes sampled four routes, two widths, one theme and one keyboard interaction. Remaining verification includes screen readers, dark mode, zoom, keyboard table and date navigation, nested dialog focus restoration, touch targets and other authenticated workflows.

## Coverage to retain and expand

- Keep the shared component, query-key, auth refresh, guard, feature model, calendar range and observability tests. Preserve their behavioral assertions when replacing MUI-specific test selectors.
- Add browser coverage in later phases for verification/recovery email, MFA enrollment and challenge, task controls, notification mutations, admin editing, optional module detail views, streaming, PWA updates and accessibility interactions. The live task/membership test already covers corresponding backend operations.
- No application test assertions failed in the final baseline runs. Existing browser accessibility and layout findings remain migration issues.

## Phase 1 verification

The final clean `npm ci` passed with the upgraded lockfile. ESLint 10.15.0 passed with zero errors and warnings after generated `coverage`, `test-results`, `playwright-report` and `.vitest` directories were added to the flat-config ignore list. `tsc -b` passed. Vitest 5.1.1 passed 107 tests in 27 files, and V8 coverage completed with 67.50% statements, 62.71% branches, 55.65% functions and 68.55% lines. `npm run audit` passed at the high-severity threshold. The full audit contains zero critical/high findings and four moderate Workbox findings. The production-only audit reported zero vulnerabilities.

Vite 8.3.8 development startup returned HTTP 200 for the SPA and Vite client endpoint. A Chromium Playwright 1.65.1 smoke run passed both workspace smoke cases after downloading the matching Chrome for Testing 159 bundle. The production preview returned HTTP 200 for the manifest and service worker. The existing PWA settings and environment-driven backend proxy remained functional. The final repository continues to support the documented Node 22.13+ and Node 24 engine floor through package metadata and verified package engine ranges. Execution in this session used Node 24.22.3. An actual Node 22 runtime was not installed in the environment.

## Phase 2 verification

The canonical design-token suite passed as part of the upgraded Vitest run: 113 tests in 28 files. The V8 report totals were 68.79% statements, 64.60% branches, 57.18% functions and 69.92% lines. Coverage includes all four presets, light/dark semantic parity, custom primary color and typography, configurable radius and density, CSS custom-property application, document theme metadata, invalid preference normalization, and local-storage round trips. TypeScript, ESLint and the production Vite/PWA build also passed after the token and provider changes. A Chromium smoke run against a fresh Vite 8 dev server passed both workspace smoke cases.

## Phase 3 verification

The shared primitive suite passed with 119 tests across 29 files. V8 totals were 66.91% statements, 63.58% branches, 54.94% functions and 68.05% lines. New coverage exercises the `cn()` merger, Base UI button/input contracts, field errors, loading/error states, and date-picker rendering. Tailwind/Vite integration, strict TypeScript, ESLint, the production build, PWA generation and repository `make check` all passed. The generated build transformed 14,362 modules and retained the existing 50-entry service-worker precache. A Chromium workspace smoke run against a fresh Tailwind-enabled Vite dev server passed both cases.

## Phase 4 verification

The complete frontend suite remains green at **119 tests across 29 files** after migrating the shared component directories. Strict TypeScript, ESLint, production build and repository `make check` passed. Existing tests continue to cover data-table sorting/paging/density, page-header menus, query retries, responsive grids, status announcements, help popovers/tooltips, guards and notification behavior without MUI-specific production dependencies.

## Phase 5 verification

The complete frontend suite remains green at **119 tests across 29 files**. `make check` passed with current backend lock, Ruff checks/formatting, ESLint and strict TypeScript; `make test` passed with **219 backend tests passed and 4 skipped**, followed by all 119 frontend tests passing. The production build passed with the responsive application shell, feature-aware navigation, project selector, notification/profile menus, keyboard shortcuts and route layout variants enabled. The shell's persisted preferences are limited to non-sensitive sidebar and selected-project identifiers.
