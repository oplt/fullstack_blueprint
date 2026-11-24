# Frontend Modernization Status

Current phase: Phase 17 — COMPLETED

Current task: Documentation and Agent Skills completed

Last updated: 2026-11-24

## Phases

- [x] Phase 0 — Audit and baseline
- [x] Phase 1 — Build tooling
- [x] Phase 2 — Design system
- [x] Phase 3 — Tailwind and shadcn
- [x] Phase 4 — Shared components
- [x] Phase 5 — Application shell
- [x] Phase 6 — Feature migration
- [x] Phase 7 — Generated API contracts
- [x] Phase 8 — Routing and state
- [x] Phase 9 — Reusable business UI
- [x] Phase 10 — AI frontend
- [x] Phase 11 — Generative UI
- [x] Phase 12 — Internationalization and accessibility
- [x] Phase 13 — Performance and PWA
- [x] Phase 14 — Storybook
- [x] Phase 15 — Blueprint configurability
- [x] Phase 16 — Testing and CI/CD
- [x] Phase 17 — Documentation and Agent Skills

## Completed tasks

- [x] Documented component, API, route, authorization and state ownership.
- [x] Recorded the dependency and browser compatibility snapshot, complete MUI/Emotion import inventory, replacement classes and migration risks.
- [x] Measured build, asset and Lighthouse metrics, and captured browser accessibility findings.
- [x] Verified setup, static checks, Vitest, pytest, live project API, all available Playwright cases, and production build.
- [x] Established per-phase acceptance gates and a decision record. Phase 0 changes are documentation only.
- [x] Upgraded Vite/Rolldown, the React Vite plugin, Vitest/coverage, React, Playwright, Testing Library, ESLint and supporting type/lint packages.
- [x] Kept TypeScript 5.9.3 after checking the current typescript-eslint peer range. Added the Node engine floor and an `npm run audit` check.
- [x] Migrated the Vite build configuration from deprecated `rollupOptions` to typed Vite 8 `rolldownOptions` while preserving manual chunks and the development proxy.
- [x] Verified clean `npm ci`, development startup, production build, PWA generation, unit tests, linting, type checking and audit behavior.
- [x] Replaced Tesla-named tokens, unavailable font references and conflicting MUI values with one semantic, framework-independent token model.
- [x] Added Minimal SaaS, Linear-inspired, Enterprise and Creative AI presets with light, dark and system modes, configurable primary color, typography, radius and density.
- [x] Added validated local persistence for theme preferences and synchronized CSS custom properties, MUI theme values and document theme metadata.
- [x] Bundled Manrope and IBM Plex Mono, added reduced-motion handling, responsive breakpoint tokens and design-token tests.
- [x] Updated `DESIGN.md` to document the implemented token contract, presets, accessibility rules and coexistence strategy.
- [x] Configured Tailwind CSS v4 through `@tailwindcss/vite`, CSS variables, dark-mode variant, utility layers, z-index variables and the `@/*` TypeScript/Vite aliases.
- [x] Added shadcn-compatible `components.json`, `cn()` utility composition, CVA variants and Lucide icons using Base UI as the single accessible primitive system.
- [x] Added typed shared primitives for controls, overlays, navigation, data display, command search, calendar/date selection, notifications and loading/error/empty states.
- [x] Preserved MUI coexistence by keeping Tailwind preflight disabled, synchronizing the existing token provider, and mounting the theme-aware Sonner toaster without changing existing snackbar consumers.
- [x] Removed redundant `cn` and `next-themes` dependencies, added primitive interaction tests, and fixed generated primitive lint/strict-type issues.
- [x] Migrated shared UI, layout, auth, guard, notification and dashboard components off MUI onto typed Base UI/shadcn primitives, native semantic HTML and Tailwind classes.
- [x] Preserved shared public slots and behavior contracts for page shells/headers/tabs, cards, query boundaries, status panels, tables, responsive grids, context inspectors, auth shell, navigation, notifications and calendar loading/error states.
- [x] Replaced shared MUI icon, tooltip, menu, skeleton, progress, badge, chip, dialog-adjacent and table implementations with Lucide/native/Base UI equivalents.
- [x] Kept behavior-focused tests green and added compatibility handling for existing feature consumers during the incremental migration.
- [x] Rebuilt the application shell with a responsive collapsible desktop sidebar, mobile drawer, branding, breadcrumbs, global page search/command palette, notification access, profile/sign-out actions, theme switcher, and skip-to-content support.
- [x] Made primary and settings navigation configuration-driven, gated optional destinations by platform feature metadata, and exposed admin settings only to administrators while retaining protected route checks.
- [x] Added keyboard navigation shortcut (Ctrl/Cmd+K), Escape dismissal, mobile close behavior, persisted non-sensitive sidebar preference, and reusable route layout variants.
- [x] Added project selection from the existing projects API, selected project persistence, notification center summary, profile menu, and `/` search shortcut.
- [x] Migrated all feature routes and feature-local components to the shared semantic/Tailwind primitives while preserving API calls, query keys, invalidation, auth guards, loading/error/empty states and form workflows.
- [x] Migrated authentication, verification/recovery, dashboard, profile/MFA/session flows, projects/tasks, calendar, notifications, administration, platform configuration and billing, flags, API keys, webhooks, templates, AI Studio, agent, RAG, memory, observability and administrative settings.
- [x] Replaced date-picker, icon and responsive/theme consumers with local typed primitives and Lucide-compatible icons, removed obsolete MUI/Emotion dependencies and vendor chunk configuration, and verified no MUI or Emotion imports remain in frontend source, package metadata or Vite configuration.
- [x] Added the deterministic all-optional OpenAPI export profile, checked-in generated OpenAPI JSON, Hey API TypeScript SDK/types, generated type index, shared transport/adapters directories, and contract freshness scripts.
- [x] Added typed `ApiError` handling for status codes, structured FastAPI validation fields and correlation IDs while preserving credentialed cookies, CSRF headers, refresh deduplication, 204 handling, multipart bodies, pagination, cancellation and stream responses.
- [x] Added the CI contract-drift workflow and API transport validation coverage.
- [x] Retained React Router after an explicit TanStack Router audit, consolidated canonical paths and feature destinations in `app/routes.ts`, and preserved public URLs, `/app` redirect behavior, lazy loading and nested auth/admin guards.
- [x] Added a navigation-scoped error boundary, typed project path construction, bounded/enum/required URL parsers, and reusable validated tab search state without changing existing deep links or browser history semantics.
- [x] Forwarded TanStack Query cancellation signals through all route-level read queries and their domain API methods, including paginated, polling, feature-gated and admin queries.
- [x] Cleared Query state on logout and identity transitions so user-scoped records cannot leak across sessions; centralized the ownership model in `ARCHITECTURE.md` and added route/search/cache isolation tests.
- [x] Added `AdvancedDataTable` with TanStack Table 8 for sorting, global filtering, client/server pagination, column visibility/resizing, row selection, expandable rows, custom cells, responsive presentation, loading/error/empty states and CSV export hooks; preserved the existing `DataTable` compatibility surface.
- [x] Added Recharts line, area, bar and donut cards with accessible descriptions and visible tabular alternatives, plus reusable trend, comparison and dashboard-filter primitives.
- [x] Added React Hook Form field wrappers, FastAPI server-error mapping, multi-step/onboarding composition, unload protection, file upload/preview, Markdown/code/JSON viewers, activity/audit timeline, user/team selectors and notification/dashboard composition helpers.
- [x] Kept rich-text and visual workflow editors as documented lazy extension points because no current backend route needs Tiptap or React Flow; optional graph/editor dependencies remain outside the core bundle.
- [x] Audited AI SDK UI, AI Elements, assistant-ui, AG-UI, Streamdown and Shiki; retained the existing shadcn/Tailwind stack and FastAPI authority because the repository has no verified production stream contract to justify a second AI protocol.
- [x] Added a Zod-validated AI event model, duplicate-safe reducer, SSE frame/parser boundary with cancellation and bounded reconnects, injectable workspace hook and isolated development fixtures for unavailable backend events.
- [x] Added reusable AI workspace blocks for conversations, composer/attachments, safe user and assistant messages, citations, tool status, approvals, models, usage, memory controls, context, artifacts and error recovery without fabricating backend activity.
- [x] Documented the missing FastAPI `text/event-stream` endpoint/event schema and security boundaries; existing AI Studio, RAG, memory and agent JSON/job workflows remain unchanged.
- [x] Added a Zod discriminated-union contract and closed registry for text, Markdown, metrics, tables, charts, comparisons, checklists, tasks, timelines, citations, files, forms, approvals, reports, workflow status and artifacts.
- [x] Added recursive payload validation with 200 KB, node, depth, child, row and field limits; malformed or unsupported content renders an accessible safe fallback with no arbitrary HTML, JSX, JavaScript or module execution.
- [x] Added fixed renderers reusing shared business UI and AI workspace primitives, plus HTTP(S)-only URL handling and safe text/Markdown display.
- [x] Added a separate validated action dispatcher requiring backend-aligned authorization and explicit confirmation before application callbacks can execute; visual rendering never grants permissions.
- [x] Added generative UI validation, renderer fallback and authorization tests and documented the reusable extension contract in [GENERATIVE_UI](GENERATIVE_UI.md).
- [x] Added i18next/react-i18next resources with English as the primary locale and Dutch/French reference namespaces, browser detection, persisted language selection and an accessible shell language selector.
- [x] Added locale-aware date/time, number, currency, pluralization and validation-message helpers; existing shared date/currency formatters now follow the active locale.
- [x] Added document `lang`/`dir` synchronization with RTL-compatible direction utilities, global visible focus treatment, coarse-pointer touch-target sizing and reduced-motion support.
- [x] Added axe-core smoke coverage and documented keyboard, screen-reader, contrast, zoom, reduced-motion and RTL manual QA requirements and known translation limitations in [INTERNATIONALIZATION_ACCESSIBILITY](INTERNATIONALIZATION_ACCESSIBILITY.md).
- [x] Retained and verified route-level lazy loading, added lazy Recharts boundaries, responsive lazy/async artifact images and dependency-free virtualization for long AI conversation histories.
- [x] Added sampled FCP/LCP/CLS/INP monitoring with local event emission only, bundle measurement via `npm run perf:measure`, and a documented React Compiler decision based on current evidence.
- [x] Hardened the generated PWA with installability metadata, outdated-cache cleanup, client claiming, update activation, navigation fallback limits and an explicit no-runtime-API-cache policy.
- [x] Added `npm run pwa:check` plus a Chromium production-preview probe covering manifest/service-worker responses, registration/control/update capability, offline fallback and zero API CacheStorage entries. Added [PERFORMANCE_PWA](PERFORMANCE_PWA.md) controls and release checks.
- [x] Added Storybook 10.6 with the React/Vite framework, a11y addon, theme/language/router decorators and a Storybook-only PWA-plugin bypass.
- [x] Added deterministic MSW 3 handlers and the generated public worker for metadata, identity and projects; production entrypoints do not import Storybook mocks.
- [x] Added stories for design tokens, typography, UI controls/dialogs/forms/uploads, navigation responsive layouts, data tables, charts, loading/empty/error states, AI conversations/streaming/tools/approvals/artifacts and generative UI valid/invalid/action states.
- [x] Added Storybook play interactions for keyboard focus, retries, approval controls, form state and safe generative fallback; Storybook static build and Chromium story smoke probes pass.
- [x] Added typed capability manifests with routes, navigation, dependency metadata, backend endpoints, feature flags, permissions and entitlements, while preserving the backend module catalog and module-pack identifiers.
- [x] Added Minimal, SaaS, AI SaaS, Knowledge Platform, Automation Platform, Enterprise and Internal Business presets with centralized branding, theme, language, navigation and layout configuration through `AppProviders`.
- [x] Added explicit build-time (`VITE_BLUEPRINT_CAPABILITIES`), deployment, runtime feature-flag, permission and entitlement boundaries; navigation and route rendering now narrow through capability availability without granting server access.
- [x] Added configuration tests and documented Copier integration and ownership boundaries in [CONFIGURATION](CONFIGURATION.md).
- [x] Added a frontend validation workflow covering reproducible lock installs, npm audit, lint, TypeScript, API contract freshness, unit/component/axe tests, production and Storybook builds, PWA checks and bundle budgets.
- [x] Added a backend Ruff/pytest workflow job and a disposable PostgreSQL/pgvector plus Redis Chromium E2E job with Alembic migrations, isolated credentials, PWA browser probes and artifact reports.
- [x] Added explicit passed/failed/skipped/blocked result classification and a security review covering cookies/CSRF, XSS, URLs, storage, session cleanup, authorization, AI content, environment variables, dependency findings and PWA caching.
- [x] Added Phase 17 architecture, dependency, design, contribution, changelog and skill-discovery documentation. The complete Codex skill set is tracked under `docs/frontend/agent-skills`; `.agents/skills` is the intended discovery path but is read-only in this checkout and must be populated when that mount is writable.

## Remaining tasks

No implementation phase remains in this modernization plan. Keep the documentation and skills current as new capabilities land; use [per-phase work and acceptance criteria](MODERNIZATION_PLAN.md) for maintenance decisions.

## Architectural decisions

Retain npm, React Router, Query and existing FastAPI authority. Base UI is the selected primitive system because it is compatible with the current shadcn configuration. [Decision 0001](decisions/0001-incremental-migration.md)

## Dependencies added

Upgraded frontend build and test dependencies in `frontend/package.json` and `frontend/package-lock.json`. Added the `audit` script and Node engine declaration. Phase 2 reuses the existing Manrope and IBM Plex Mono packages. Phase 3 uses the existing Tailwind/Base UI, CVA, Lucide, Sonner, command, date, and resizable-panel dependencies with one npm lockfile. Phase 7 adds Hey API 0.99.0 and its fetch generator as development-only contract tooling, with a js-yaml override to the patched release. Phase 9 adds TanStack Table 8.21 and Recharts 3.11; charts and optional editor extension points are isolated from routes that do not import them. Phase 12 adds i18next 27.2/react-i18next 18.0 for locale resources and axe-core 4.14 for automated accessibility smoke checks. Phase 14 adds Storybook 10.6 React/Vite, the a11y addon, MSW 3 and msw-storybook-addon 3 as development-only documentation/test tooling. Phase 15 adds no dependencies; configuration uses existing React, Vite and router primitives.

## Dependencies removed

Removed redundant `cn` and `next-themes` packages, then removed MUI, MUI X and Emotion after the feature consumer migration.

## Tests executed

- Clean frontend `npm ci` passed. `npm run lint` passed with zero errors and warnings. `tsc -b` and `npm run build` passed.
- Vitest 5.1.1 passed 143 tests across 45 files, including canonical token, preference persistence, shared primitive coverage, axe-core accessibility smoke checks, locale selection/formatting, virtualization, web-vitals safety, API transport behavior, Phase 9 business UI workflows, Phase 10 stream/security boundaries, Phase 11 generative UI safety and Phase 15 configuration/preset gating. Storybook 10.6 static build passed with deterministic MSW fixtures and Chromium story probes passed for Button and Generative UI fallback stories.
- Strict TypeScript, ESLint and the production Vite/PWA build passed after the complete feature migration. `rg` found no `@mui` or `@emotion` imports in frontend source, package metadata or Vite configuration.
- `npm run api:export`, `npm run api:generate`, and `npm run api:check` passed against the all-optional backend contract profile; the generated document contains 96 paths and 151 schemas.
- `npm run audit` passed at the high-severity threshold. The full report has zero critical/high and six moderate findings (four Workbox plus two Storybook docgen dependency entries). Production-only audit has zero vulnerabilities.
- Backend `make test` passed 219 tests with 4 documented skips; the frontend suite passed 143 tests. `make check` remains environment-blocked when uv cannot write its cache temporary file.
- Phase 16 local validation passed the production build, `pwa:check`, `perf:check` (1,042,273 summed gzip bytes, 338,515 JavaScript gzip bytes, 21,880 CSS gzip bytes, 47 JS/CSS assets), API contract check, Storybook build and Chromium PWA probe (registered/active/controlled/update-capable, offline reset-password 200, zero API cache entries). The disposable-service E2E workflow is configured for CI and was not counted as a local pass without those services.
- Vite 8 generated PWA manifest, registration script and service worker. Existing proxy and environment variables were retained.
- Backend checks were not changed by Phase 6. [Test baseline](TEST_BASELINE.md), [performance baseline](PERFORMANCE_BASELINE.md)

## Known issues

Browser findings from Phase 0 remain, including auth landmarks and heading order, sidebar semantics/naming, contrast and dashboard overflow. Six moderate glob/minimatch advisories remain through Workbox and Storybook docgen dependencies without compatible fixes in the selected releases. Node 22 runtime execution and authenticated PWA update behavior remain future verification. [Audit](AUDIT.md), [dependency matrix](DEPENDENCY_MATRIX.md)

## Backend integration requirements

Keep cookie, CSRF, access roles, optional registration and platform metadata semantics. Core OpenAPI with calendar enabled exposed 58 paths / 78 operations / 80 schemas. The deterministic all-optional contract profile exposes 96 paths / 127 operations / 151 schemas. Phase 10 still needs a verified event contract alongside existing JSON APIs.

## Blockers

None for completion of Phase 16. Storybook visual regression baselines remain intentionally deferred until a stable browser/font matrix is available; deterministic stories and interaction probes are in place. Dutch/French feature copy remains intentionally incomplete and falls back to English. The current FastAPI contract still lacks a production SSE event endpoint, which is documented in [AI workspace architecture](AI_WORKSPACE.md). Optional provisioned-user and AI/RAG E2E suites remain credential/service gated by design.

## Phase 17 completion

- [x] Updated root and frontend contributor documentation, architecture, dependency ownership, design guidance, changelog, and migration status.
- [x] Added repository-local Codex-compatible skills under `.agents/skills/` for feature delivery, UI primitives, tables, forms, dashboards, AI/generative UI, API generation, accessibility, security, and testing.
- [x] Documented skill discovery, invocation boundaries, practical examples, and required validation in [AGENT_SKILLS](AGENT_SKILLS.md).

## Next action

Maintain the documentation and skills alongside future feature work while preserving backend feature-flag, CSRF, and authorization boundaries.
