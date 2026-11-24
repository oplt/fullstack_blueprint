# Fullstack Blueprint 2.0 frontend — final architecture review

**Review date:** 2026-11-24  
**Reviewer:** Independent principal frontend architecture, security and quality review  
**Scope:** `frontend/`, frontend build/test configuration, generated API boundary, and the modernization documentation under `docs/frontend/`.

## Executive assessment

The compatibility-layer removal is real: the frontend has no `muiCompat`, no `styleCompat`, no direct MUI or Emotion package, and the production build uses native shadcn/Base UI primitives, semantic HTML and Tailwind utilities. Core authentication, query ownership, route protection, CSRF transport, PWA generation and API-contract checks are credible foundations.

This is **not yet a production-ready foundation for every advertised surface**. The AI workspace is an injectable SSE prototype rather than a connected product capability, and generative actions do not have a server-issued capability/nonce contract. Those two P1 gates must be closed (or the surfaces must remain explicitly disabled) before production enablement. Real-browser, keyboard, contrast, responsive and provisioned-user evidence is also incomplete in this environment. The foundation is suitable for continued application development once those gates are made explicit in release automation.

No P0 defect was found in the inspected frontend code.

## Review method and evidence

I inspected the source tree, package and lock manifests, Vite/TypeScript/ESLint/Storybook/PWA configuration, generated API artifacts, auth/query/routing code, AI and observability boundaries, modernization documents, unit/accessibility tests and CI configuration. I also searched for retired MUI/Emotion identifiers and ran the checks listed below. The working copy contained the prior migration edits; I did not reset or discard them.

Severity uses the repository convention:

- **P0:** exploitable or availability-critical defect requiring an immediate stop-ship fix.
- **P1:** release-blocking security, correctness or missing promised capability.
- **P2:** material architectural, maintainability, test or performance risk that should be scheduled.
- **P3:** polish, documentation or low-risk improvement.

## Findings

### P0 — none

No critical frontend vulnerability, credential exposure, unrestricted HTML execution, API-cache leakage or cross-user query-cache defect was verified. Backend authorization remains the authority and was not re-audited as part of this frontend review.

### P1-01 — unbounded stream authentication recovery (fixed)

**Severity:** P1 — fixed in this audit  
**Affected files:** `frontend/src/api/client.ts`, `frontend/src/api/client.test.ts`

**Description and evidence:** `apiFetchStream` retried itself after every successful refresh without a retry guard. A stream endpoint that continued returning 401 could therefore refresh and recurse indefinitely. The JSON transport already had a bounded retry, but the stream path did not.

**Impact:** repeated refresh/network traffic, hung AI work and avoidable load during an expired or invalid session.

**Correction:** the stream helper now accepts an internal `retry` flag and replays once with `retry = false`; a second 401 is surfaced as an `ApiError`.

**Acceptance criteria:** a 401 stream response causes at most one refresh and two stream requests; a second 401 rejects; concurrent refresh remains single-flight. The regression test in `client.test.ts` covers this and the full Vitest suite passes.

### P1-02 — unsafe external observability URL schemes (fixed)

**Severity:** P1 — fixed in this audit  
**Affected files:** `frontend/src/features/observability/urlBuilders.ts`, `frontend/src/features/observability/urlBuilders.test.ts`

**Description and evidence:** `new URL(baseUrl)` by itself accepts schemes such as `javascript:`. The old `openExternalUrl` helper passed the original value to `window.open` without enforcing an HTTP(S) scheme.

**Impact:** a malicious or misconfigured backend/tenant value could produce unsafe navigation or phishing behavior from an authenticated view.

**Correction:** URL construction and opening now allow only `http:` and `https:`; invalid values return `null` or are ignored. Tests cover `javascript:` rejection and the absence of a browser open.

**Acceptance criteria:** every observability, citation and artifact navigation path rejects non-HTTP(S) URLs; tests cover malformed, relative and dangerous schemes; no raw URL is opened before validation.

### P1-03 — logout could retain identity-scoped cache after server failure (fixed)

**Severity:** P1 — fixed in this audit  
**Affected files:** `frontend/src/features/auth/context/AuthContext.tsx`

**Description and evidence:** the prior `logout()` awaited the server request and only then cleared TanStack Query state. A network or server error left the previous user rendered and cached in the browser.

**Impact:** sensitive records could remain visible after a user attempted to sign out, especially on unreliable networks or a failed refresh boundary.

**Correction:** cache cancellation/removal and the `auth.me` null transition now run in `finally`, regardless of the server response.

**Acceptance criteria:** a rejected logout request immediately removes identity-scoped queries and renders the signed-out state; a later retry can clear the server cookie. `AuthContext.test.tsx` covers the failed-request/cache-isolation regression, and the complete test/build suite passes.

### P1-04 — date calendar was a no-op compatibility implementation (fixed)

**Severity:** P1 — fixed in this audit  
**Affected files:** deleted `frontend/src/components/ui/dateCompat.tsx`; `frontend/src/features/calendar/components/MonthDateCalendar.tsx`; `frontend/src/app/providers.tsx`

**Description and evidence:** the compatibility `LocalizationProvider` ignored its children-only contract, and its calendar rendered a native date input while silently dropping `slots`, `views`, `fixedWeekNumber`, `referenceDate` and day-marker behavior. The feature supplied a month-grid API that never reached a real calendar implementation.

**Impact:** incorrect calendar semantics, missing task/appointment markers, broken month-grid expectations and reduced keyboard/date-picker accessibility.

**Correction:** the compatibility provider/file was deleted. `MonthDateCalendar` now composes the existing shadcn/Base UI `Calendar` and `CalendarDayButton`, preserving selected month, fixed weeks, outside days, day selection and event markers.

**Acceptance criteria:** month view renders a real grid, selecting a day updates the anchor date, markers remain visible, outside days and keyboard navigation work, and no date compatibility import exists. TypeScript, Vitest, lint and production build pass; browser keyboard verification remains a release gate.

### P1-05 — generative UI actions lack a server-issued capability boundary (open)

**Severity:** P1 — release blocker for privileged AI actions  
**Affected files:** `frontend/src/features/ai/generative-ui/actions/actionDispatcher.ts`, `frontend/src/features/ai/generative-ui/renderers/GenerativeUiRenderer.tsx`, `docs/frontend/AI_WORKSPACE.md`, `docs/frontend/SECURITY_REVIEW.md`

**Description and evidence:** the dispatcher validates a closed Zod action shape, then trusts caller-supplied `authorize`, `confirm` and `execute` callbacks. The renderer invokes `onAction` for model-provided actions. There is no server-issued, user/session-bound capability, nonce, expiry or backend authorization response in this frontend boundary. UI confirmation is not authorization.

**Impact:** wiring a privileged callback incorrectly would allow model-controlled content to trigger client-side mutations or privileged navigation. Hidden buttons or client capability manifests cannot protect an API.

**Recommended correction:** keep privileged action execution disabled by default. Define a backend endpoint that issues short-lived, user/session/action-bound capabilities and re-authorizes the action server-side; require the capability and an idempotency key at execution time, reject expired/replayed capabilities, and audit the result. Keep the renderer limited to safe presentation until that contract exists.

**Acceptance criteria:** an unauthorized, expired, replayed or cross-user capability is rejected by the backend; only an explicitly confirmed action with a valid capability executes; integration/E2E coverage proves the negative cases; documentation no longer calls injected callbacks “backend-authorized.”

### P1-06 — AI streaming is an unconnected prototype, not a production feature (open)

**Severity:** P1 — release blocker for live AI workspace claims  
**Affected files:** `frontend/src/features/ai/workspace/streaming.ts`, `frontend/src/features/ai/workspace/useAiWorkspaceStream.ts`, `docs/frontend/AI_WORKSPACE.md`, backend OpenAPI contract used by `frontend/src/api/generated/openapi.json`

**Description and evidence:** the frontend has a carefully bounded SSE parser/reducer and test fixtures, but the documented FastAPI contract exposes JSON/job polling routes and no `text/event-stream` route or event schema. `connectAiStream` is injectable and no production route wires it to an authenticated endpoint.

**Impact:** the phase documentation can be read as shipping live streaming when the feature cannot connect in production. Reconnect, cancellation and event validation are unverified against the real server.

**Recommended correction:** either mark the workspace experimental and keep it out of production navigation, or add and version a backend SSE contract (event envelope, authorization, replay/`Last-Event-ID`, cancellation, quotas and error semantics), then connect through the existing cookie/CSRF transport.

**Acceptance criteria:** the OpenAPI contract contains the stream endpoint/event schema; a provisioned-user E2E test proves start, delta, cancellation, reconnect and authorization failure; feature gating prevents accidental enablement before those checks pass.

### P2-01 — legacy icon alias layer remains

**Severity:** P2  
**Affected files:** `frontend/src/components/ui/iconsCompat.tsx` and its feature consumers

**Description and evidence:** direct MUI imports are gone, but many files still import MUI-era names (`Visibility`, `PeopleAlt`, `SmartToy`, etc.) from a file named `iconsCompat`. The aliases now map to real Lucide icons, so this is not a security defect, but it preserves the old vocabulary and another generic translation layer.

**Impact:** architecture remains harder to search and contributors may continue adding compatibility aliases instead of importing Lucide directly.

**Recommended correction:** migrate consumers to named Lucide imports, delete `iconsCompat.tsx`, and add a lint/CI guard against `*Compat` UI imports.

**Acceptance criteria:** `rg "iconsCompat|Compat\.tsx" frontend/src` is empty except historical documentation; icon imports use Lucide or domain-specific components; visual snapshots remain unchanged.

### P2-02 — duplicate data-table implementations

**Severity:** P2  
**Affected files:** `frontend/src/components/ui/DataTable.tsx`, `frontend/src/components/ui/AdvancedDataTable.tsx`, related stories/tests

**Description and evidence:** both components implement table behavior and APIs; `DataTable` remains a substantial implementation while `AdvancedDataTable` adds another TanStack Table facade. The migration documentation describes a compatibility/re-export relationship rather than one canonical contract.

**Impact:** fixes to sorting, selection, keyboard behavior or pagination can diverge; bundle and test surface grow without a clear ownership boundary.

**Recommended correction:** choose one canonical table API, provide a thin, time-bounded deprecation adapter for existing callers, then remove the duplicate and consolidate stories/tests.

**Acceptance criteria:** one implementation owns selection/sort/expand/pagination semantics; all consumers use the canonical contract; keyboard interaction and accessibility tests cover the retained table.

### P2-03 — generated API SDK is produced but not used as the runtime contract

**Severity:** P2  
**Affected files:** `frontend/src/api/generated/hey/**`, `frontend/src/api/transport/generatedClient.ts`, `frontend/src/api/*.ts`, `frontend/package.json`

**Description and evidence:** `api:generate` and `api:check` maintain Hey API output, but runtime feature modules continue to use handwritten wrappers and `apiFetch<T>` assertions. `generatedClient` is exported from the transport barrel without production consumers.

**Impact:** schema drift can pass TypeScript because generic assertions do not validate wire shapes; two transport paths increase maintenance and cookie/CSRF divergence risk.

**Recommended correction:** migrate one bounded domain at a time through an adapter that preserves the single credentialed transport, or remove unused SDK generation until adoption is funded. Add a CI check for generated-client drift/unused output.

**Acceptance criteria:** each migrated domain has generated request/response types at the boundary, runtime transport behavior is identical, and no unused generated client is shipped without an owner.

### P2-04 — authored TypeScript permits pervasive `any`

**Severity:** P2  
**Affected files:** `frontend/eslint.config.js`, numerous feature components/hooks, for example `frontend/src/features/platform-admin/components/FlagsSection.tsx` and `frontend/src/components/ui/DataTable.tsx`

**Description and evidence:** ESLint explicitly disables `@typescript-eslint/no-explicit-any`, and many migrated handlers use `event: any`, mutation errors use `any`, and list callbacks use `any`.

**Impact:** event target mistakes, mutation context drift and API-shape errors are hidden precisely where the migration changed component contracts.

**Recommended correction:** enable the rule for authored source, use `ChangeEvent<HTMLInputElement | HTMLSelectElement>`, `MouseEvent`, typed mutation error/context generics and `unknown` narrowing; allow exceptions only in generated code.

**Acceptance criteria:** lint rejects new authored `any`; an allowlist contains only generated/vendor files; touched feature files compile without casts that erase event or API types.

### P2-05 — `FormField` still exposes MUI-shaped contracts

**Severity:** P2  
**Affected files:** `frontend/src/components/ui/form-field.tsx` and callers using `InputProps`, `SelectProps`, `InputLabelProps` or `fullWidth`

**Description and evidence:** the native composition still accepts legacy names and intentionally ignores `fullWidth` and `InputLabelProps`. This is a compatibility vocabulary retained after the compatibility module was deleted.

**Impact:** unsupported properties compile and are silently ignored; future contributors can mistake this for a faithful MUI contract.

**Recommended correction:** rename to native contracts (`startAdornment`, `endAdornment`, `selectProps`, `labelProps`) or adopt the existing Field primitives; remove ignored props and type event handlers at call sites.

**Acceptance criteria:** no MUI-shaped prop names remain in authored UI APIs; unsupported properties fail TypeScript; labels/descriptions/errors retain stable IDs and accessible relationships.

### P2-06 — internationalization and browser accessibility are not fully evidenced

**Severity:** P2  
**Affected files:** `frontend/src/i18n/**`, feature views with literal English copy, `docs/frontend/MIGRATION_STATUS.md`, `docs/frontend/AUDIT.md`

**Description and evidence:** Dutch and French resources intentionally fall back to English, and the historical browser audit still records auth landmarks/heading order, sidebar naming, contrast and dashboard overflow findings. Vitest axe smoke tests do not replace real keyboard, zoom, screen-reader and contrast checks.

**Impact:** “complete” modernization language overstates locale and WCAG coverage; regressions can ship in responsive layouts and translated flows.

**Recommended correction:** publish a locale/key coverage policy, add missing feature translations or explicitly scope supported locales, and make Playwright keyboard/contrast/390px/200% zoom smoke tests release gates.

**Acceptance criteria:** supported-locale key completeness is measured; auth/sidebar/dashboard browser checks pass at required breakpoints; known findings are either corrected or tracked with owners and dates.

### P2-07 — browser/PWA and provisioned-user E2E evidence is environment-blocked

**Severity:** P2  
**Affected files:** `frontend/scripts/check-pwa-browser.mjs`, `frontend/playwright.config.ts`, `.github/workflows/frontend-validation.yml`

**Description and evidence:** `npx playwright test --list` discovers 39 tests across Chromium, Firefox and WebKit, but this environment has no Playwright Chromium executable, so `npm run pwa:browser` cannot launch. Provisioned-user/AI/admin suites also require disposable services and credentials.

**Impact:** route redirects, cookie/CSRF writes, offline fallback, update behavior and responsive accessibility are not independently verified by this local run.

**Recommended correction:** ensure CI installs pinned browser binaries and disposable services, publish pass/skip/infrastructure-blocked status separately, and require at least Chromium PWA plus signed-out/authenticated smoke tests before release.

**Acceptance criteria:** CI records a successful browser run on a clean checkout; no test is reported as passed when it was skipped for missing services; PWA probe verifies registration/control, offline navigation and zero API runtime cache entries.

### P2-08 — moderate transitive dependency advisories remain

**Severity:** P2  
**Affected files:** `frontend/package-lock.json`, Storybook docgen and Workbox dependency paths

**Description and evidence:** `npm run audit` passes the configured high-severity threshold but reports six moderate `glob`/`minimatch` advisories with no compatible fix in the selected Storybook/Workbox versions.

**Impact:** primarily development/build-time denial-of-service exposure; not currently a production runtime package finding, but the dependency graph is not clean.

**Recommended correction:** track upstream fixes, evaluate newer Storybook/Workbox releases in a branch, and keep production-only audit separate from dev-tool audit.

**Acceptance criteria:** advisories are either removed by an upgrade or documented with owner, affected command surface and review date; no critical/high advisory is accepted.

### P2-09 — Storybook build emits a host-settings warning

**Severity:** P2  
**Affected files:** `.storybook/**`, Storybook build environment

**Description and evidence:** `npm run storybook:build` completes, but Storybook cannot create `/home/polat/.storybook/settings.json` because that directory is absent in the current environment.

**Impact:** build is successful but not hermetic across developer/CI homes and the warning can hide real settings failures.

**Recommended correction:** configure a writable settings directory or disable global settings writes in CI; keep Storybook output deterministic.

**Acceptance criteria:** clean CI Storybook builds without filesystem warnings and produces the same documented stories.

### P2-10 — route fallback skeleton had no layout dimensions (fixed during review)

**Severity:** P2 — fixed in this audit  
**Affected files:** `frontend/src/app/router.tsx`

**Description and evidence:** the migrated `PageLoader` rendered empty animated `div` elements without height/width and placed the card group in a row with no usable fallback layout. The previous MUI skeletons had explicit heights and responsive stacking.

**Impact:** lazy-route and capability loading could show a blank or collapsed loading state, particularly on small screens.

**Correction:** the fallback now uses the shared `Skeleton` primitive with explicit dimensions, semantic spacing and responsive card stacking; the not-found title is an `h1`.

**Acceptance criteria:** route loading renders visible full-width/card placeholders at mobile and desktop widths; the not-found page has a correctly ranked heading; lint, type-check and build pass.

### P2-11 — historical component inventory was easy to misread as current (fixed during review)

**Severity:** P2 — documentation correction  
**Affected files:** `docs/frontend/COMPONENT_INVENTORY.md`, `docs/frontend/ARCHITECTURE.md`

**Description and evidence:** the inventory correctly retained the old MUI import appendix, but its dependency/theme/build tables were not explicitly labelled as historical. A reader could therefore infer that MUI and `app/theme.ts` were still active despite the completed migration.

**Impact:** inaccurate architecture decisions, accidental reintroduction of retired dependencies and misleading release review evidence.

**Correction:** the inventory now labels all baseline rows as historical and points readers to the current architecture/dependency documents. The architecture document already describes the native primitive/runtime ownership.

**Acceptance criteria:** historical snapshots are labelled at the document introduction; current docs contain the authoritative dependency and ownership state; a repository search shows no active MUI/Emotion dependency or import.

### P3-01 — migrated files are difficult to review

**Severity:** P3  
**Affected files:** several feature/page files under `frontend/src/features/**` and `frontend/src/pages/**`

**Description and evidence:** many migration edits are compressed into single-line JSX and retain data-dependent inline style objects where Tailwind classes would be clearer.

**Impact:** lower readability and higher review/regression cost; no verified runtime defect.

**Recommended correction:** format touched files, extract repeated sections and use semantic token utilities for stable layout values. Do this opportunistically, not as a redesign.

**Acceptance criteria:** changed files are formatter-readable, repeated primitives have one owner, and bundle/performance budgets remain unchanged.

## Verified strengths

- Zero `muiCompat`, `styleCompat`, direct `@mui` or `@emotion` imports in frontend source/manifests/configuration; `npm ls` reports no direct packages.
- Cookie-authenticated transport keeps tokens out of local storage, sends CSRF headers and exposes structured status/field/correlation errors.
- TanStack Query owns remote state; route guards and backend checks remain distinct, and logout/sign-in cache boundaries are explicit.
- Structured generative output uses Zod validation, a closed component registry, bounded payloads and text/URL-safe renderers; no raw HTML injection was found.
- PWA checks verify generated artifacts and absence of API runtime caching; bundle budgets pass.
- Shared UI has shadcn/Base UI primitives, semantic HTML, Lucide icons and route-level lazy loading. Storybook and axe smoke coverage exist.

## Validation evidence

All commands below were run from `frontend/` on 2026-11-24 unless stated otherwise:

| Check | Result |
| --- | --- |
| `npm ci --cache /tmp/blueprint-npm-cache` | Passed; locked install completed (803 packages; npm reports six moderate advisories). |
| `npm run lint` | Passed. |
| `npx --no-install tsc -b` | Passed. |
| `npm test -- --run` | Passed — 46 files, 147 tests. |
| `npm run test:coverage` | Passed — 62.26% statements, 56.39% branches, 49.76% functions, 68.34% lines. |
| `npm run build` | Passed — Vite/PWA production build. |
| `npm run pwa:check` | Passed — manifest, registration, service worker and no API runtime cache. |
| `npm run perf:measure` / `npm run perf:check` | Passed — 1,065,359 total gzip, 361,669 JS gzip, 21,800 CSS gzip, 48 JS/CSS assets, all within budget. |
| `npm run api:check` | Passed — generated API contract current. |
| `npm run storybook:build` | Passed; emits the host-settings warning described in P2-09. |
| `npm run audit` | Passed configured high threshold; six moderate transitive advisories remain. |
| `npx playwright test --list` | Passed discovery — 39 tests across Chromium/Firefox/WebKit. |
| `npm run pwa:browser` | Infrastructure-blocked — Playwright Chromium executable is not installed in this environment. |
| `git diff --check` | Passed. |
| MUI/Emotion grep | Passed — no retired compatibility or direct MUI/Emotion identifiers in frontend source/manifests/configuration. |

## Production-readiness decision

**Core foundation:** conditionally suitable. The React/TanStack Query/Tailwind/shadcn transport and route architecture is a reasonable reusable base, and the compatibility-layer elimination is complete.

**Whole advertised product:** not yet suitable for production release. Keep AI streaming and privileged generative actions disabled until P1-05 and P1-06 have a verified backend contract and negative-path E2E coverage. Before calling the foundation production-ready, run the browser/PWA and provisioned-user gates in CI, close or explicitly accept the known accessibility/locale findings, and schedule the P2 type/duplicate-contract cleanup.

