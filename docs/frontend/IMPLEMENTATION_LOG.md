# Frontend implementation log

## 2026-11-24 — Phase 0 completed

Audited `3271ffb`, including the mandatory frontend directories and configuration, npm lockfile, backend router, Pydantic contracts, auth/session/CSRF, optional gates, and AI transport. Captured the current feature and component boundaries before changing dependencies. Checked published release metadata and advisory results.

Created [AUDIT](AUDIT.md), [ARCHITECTURE](ARCHITECTURE.md), [MODERNIZATION_PLAN](MODERNIZATION_PLAN.md), [MIGRATION_STATUS](MIGRATION_STATUS.md), [DEPENDENCY_MATRIX](DEPENDENCY_MATRIX.md), [TEST_BASELINE](TEST_BASELINE.md), [PERFORMANCE_BASELINE](PERFORMANCE_BASELINE.md), this log, [COMPONENT_INVENTORY](COMPONENT_INVENTORY.md), and [decision 0001](decisions/0001-incremental-migration.md). No previously tracked source, configuration, lockfile or documentation was modified. No application packages or behaviors changed.

Validated with locked installation, lint/type/format checks, unit and component tests, disposable PostgreSQL/pgvector migration, Redis, live API tests and browser runs. Docker was unavailable to this session. Local disposable processes, a temporary S3 emulator, and browser libraries in the scratch directory provided the required isolation. All 36 Playwright cases across configurations passed. Default optional PyMuPDF parser coverage retained three skips.

Measured 13.10 s production build wall time, 1,732,702 bytes of output and 817,437 bytes of HTML entry/preload JS. Lighthouse captured mobile and desktop sign-in, axe sampled authenticated and anonymous surfaces, and a Chromium service-worker probe confirmed offline shell navigation. Accessibility findings and dependency advisories are pre-existing baseline work for their assigned phases.

The next phase is the compatible build-toolchain upgrade described in the [migration plan](MODERNIZATION_PLAN.md).

## 2026-11-24 — Phase 1 completed

Upgraded the frontend toolchain to Vite 8.3.8, `@vitejs/plugin-react` 6.3.0, Vitest 5.1.1 with coverage-v8 5.1.1, React and React DOM 19.3.1, Playwright 1.65.1, React Testing Library 16.3.3, jest-dom 8.0.0, user-event 14.6.13, ESLint 10.15.0, `@eslint/js` 10.0.1, typescript-eslint 8.74.0, React hooks 7.1.1, React refresh 0.5.8, globals 17.14.0, Vite PWA 2.0.0 and Zod 4.6.7. TypeScript remains 5.9.3 because the current typescript-eslint peer contract does not support TypeScript 7. `jsdom` remains 26.1.0 because the newer jsdom release changed the existing landmark test behavior.

Moved the Vite output configuration from deprecated `rollupOptions` to typed Vite 8 `rolldownOptions` and replaced object-form manual chunks with a path-based function that preserves the React, router, Query, forms and MUI groups. The `/api` proxy and `BACKEND_PROXY_TARGET` behavior are unchanged. Added a Node engine floor of 22.13.0 and the `npm run audit` vulnerability check. React Compiler remains disabled because Phase 1 produced no compatibility or performance evidence to justify enabling it globally. npm remains the authoritative package manager because this is a single frontend package and `npm ci` is reproducible.

Validation completed with a clean `npm ci`, ESLint, TypeScript build, Vitest 107/107, Vite production build and PWA generation. `npm run audit` passes at high severity and production-only audit reports zero vulnerabilities. The full audit reports four moderate Workbox/glob/minimatch findings inherited from `vite-plugin-pwa@2.0.0`, with no compatible fix. The production build transformed 12,238 modules and completed in 0.634 seconds in the local run. The upgraded lockfile is the only frontend lockfile.

Phase 1 leaves MUI and Emotion in place for the planned coexistence migration. No backend code, API behavior, authentication, PWA route behavior or user data changed.

## 2026-11-24 — Phase 2 completed

Replaced the Tesla-named `designTokens.ts`, unavailable Universal Sans references, and conflicting Linear-only `DESIGN.md` guidance with a canonical semantic token model. `createDesignTokens()` now defines background, foreground, surface, semantic status, border, focus, chart, typography, font-weight, spacing, radius, elevation, motion, density and responsive breakpoint tokens. `cssVariablesFor()` and `applyDesignTokens()` expose the contract as CSS custom properties and document metadata.

Added four reusable presets: Minimal SaaS, Linear-inspired, Enterprise and Creative AI. Each supports light, dark and system color modes, with validated overrides for primary color, typography, border radius and compact/comfortable density. Theme preferences persist in local storage under `fullstack-blueprint.theme`; malformed values fall back safely.

Updated the MUI compatibility theme to consume the canonical tokens, synchronized the existing color-mode context with all preference setters, bundled Manrope and IBM Plex Mono, and added global reduced-motion and semantic CSS variable fallbacks. Existing MUI pages remain supported while later phases migrate components.

Updated the PWA manifest's static default theme/background colors to the canonical Minimal SaaS light palette; runtime light/dark application remains controlled by the persisted document theme.

Validation passed with TypeScript, Vite production build, ESLint and 113 Vitest tests across 28 files. The new token tests cover preset completeness, light/dark parity, customization, CSS variable application, MUI theme projection and preference persistence. `DESIGN.md` now documents the implemented source of truth and its coexistence/accessibility rules.

## 2026-11-24 — Phase 3 completed

Completed the Tailwind CSS v4 and shadcn-compatible layer using the existing Base UI primitives as the single accessible primitive system. Vite now runs `@tailwindcss/vite`; TypeScript and Vite both resolve the `@/*` alias; `components.json` records the Base Nova, CSS-variable, Lucide and component alias contract; and `src/lib/utils.ts` provides the `clsx` plus `tailwind-merge` `cn()` helper.

Added typed reusable primitives for buttons, fields, inputs, textareas, checkbox/radio/switch/slider controls, select/combobox, dialog/alert-dialog/sheet/drawer, dropdown/context menus, popovers/tooltips, tabs/accordion/collapsible, avatar/badge/card/table, skeleton/separator/progress/spinner, calendar/date-picker/date-range-picker, breadcrumb/pagination/sidebar/navigation, command palette, Sonner toast, scroll/resizable panels, and empty/error/loading states. All primitives are domain-independent and use Base UI or native accessible elements with CVA variants and Lucide icons.

Migration safety is preserved: Tailwind preflight remains disabled while MUI is installed, semantic token variables are shared with Tailwind, the existing MUI snackbar remains compatible, and the theme-aware Sonner toaster is mounted in the provider tree. Redundant `cn` and `next-themes` dependencies were removed after generated imports were consolidated onto `@/lib/utils`.

Validation passed with 119 Vitest tests across 29 files, ESLint, strict TypeScript, Vite production build, PWA generation and the repository `make check` target. The build transformed 14,362 modules. Existing browser smoke coverage remains available for the MUI application shell; primitive interaction coverage was added for utility merging, controls, field errors, loading/error states and date-picker output.

## 2026-11-24 — Phase 4 completed

Migrated the shared component layer before feature pages: page header/shell/tabs, cards and metrics, responsive/form/workspace grids, query and feedback boundaries, context inspector, JSON and key/value displays, run status panel/chip, advanced settings, help/disabled explanations, skip link, scroll region, data table, auth shell/marketing panel, protected route, settings tabs, notification badge/list item and dashboard calendar.

These components no longer import MUI, Emotion or Material icons. They use typed Base UI/shadcn primitives, native semantic HTML, Tailwind classes, Lucide icons and Sonner-compatible feedback. Public slots and behavior contracts were retained where practical, including sorting, paging, selection, expansion, density, column visibility, retries, loading announcements, status progress, tooltip/popover help, responsive layouts and calendar loading/error states.

Validation passed with the complete 119-test frontend suite, strict TypeScript, ESLint, production Vite/PWA build (14,576 modules), and the repository `make check` target. Existing feature pages remain temporarily mixed where Phase 5+ migration work is intentionally scheduled.

## 2026-11-24 — Phase 5 completed

Completed the application shell and navigation layer with a responsive desktop sidebar, mobile drawer, branded workspace header, feature-aware navigation, settings navigation, project selector, semantic breadcrumbs, global search, command palette, notification center, profile menu, theme switcher, contextual page title and skip link. Navigation derives optional destinations from platform metadata and settings visibility, while protected routes remain the authorization boundary.

Added `Ctrl/Cmd+K`, `/`, and Escape keyboard behavior, focusable navigation controls, mobile overlay dismissal, persisted sidebar collapse and selected project preferences, and route-derived reusable layout variants for dashboard, full-width, split-panel, settings and AI workspaces.

## 2026-11-24 — Phase 6 completed

Migrated every existing feature route and feature-local component onto the shared semantic/Tailwind primitive layer. The migration covered authentication and account recovery, verification, dashboard, profile/MFA/sessions, projects and task workflows, calendar, notifications, administration, platform configuration and billing, feature flags, API keys, webhooks, email templates, AI Studio, agent execution/history, RAG documents and evaluations, memory, observability and administrative settings.

The migration retained existing API clients, React Query keys and invalidation, route guards, platform feature gates, admin checks, form validation, file uploads, loading/error/empty/success/disabled feedback and calendar/date semantics. MUI date pickers and Material icons were replaced by local typed date primitives and Lucide-compatible icon exports. MUI, MUI X, Emotion and their Vite vendor chunk configuration were removed after repository-wide import and dependency searches.

Validation passed with 122 Vitest tests across 29 files, strict TypeScript, ESLint, production Vite/PWA build and a clean `rg` search for `@mui` and `@emotion` in frontend source, package metadata and Vite configuration.

## 2026-11-24 — Phase 7 completed

Added `backend/scripts/export_openapi.py`, which enables every optional router before importing FastAPI and writes a sorted, newline-terminated OpenAPI document. The committed profile currently contains 96 paths and 151 schemas. Frontend commands are `npm run api:export`, `npm run api:generate`, `npm run api:generate:all`, and `npm run api:check`.

Hey API 0.99.0 with the fetch client now generates the SDK and TypeScript contracts under `frontend/src/api/generated/hey`. The generated artifacts are paired with the deterministic contract JSON and a generated operation map. The existing browser transport remains authoritative for cookies, CSRF, refresh single-flight, structured errors, multipart requests, cancellation, pagination, 204 responses and stream responses; `ApiError` exposes status, field-level validation errors and correlation IDs.

Added `frontend/src/api/transport`, `frontend/src/api/adapters`, `frontend/src/api/index.ts`, API transport validation coverage, and `.github/workflows/api-contract.yml` to fail CI when either the OpenAPI document or generated Hey API artifacts drift.

## 2026-11-24 — Phase 8 completed

Audited React Router against TanStack Router and retained React Router: the existing BrowserRouter, lazy route entries, nested auth/admin guards, feature metadata gates and history behavior already match the application architecture, while a migration would add a competing route model without measured benefit. Added the canonical `app/routes.ts` registry and builders, navigation-resetting route error boundary, and focused route contract tests.

Added validated URL boundary helpers for enum/alias tabs, bounded integer pagination values and required auth tokens. Existing `useTabQueryParam` behavior remains backward compatible and verification/reset links now reject malformed values safely.

Forwarded TanStack Query cancellation signals through all read queries and the corresponding domain API methods, including paginated, polling, feature-gated and admin views. Session transitions now cancel and clear user-scoped Query state on logout and sign-in, preventing cross-user cache leakage without duplicating server state in a global store. Updated the architecture and migration records with the ownership and routing decision.

## 2026-11-24 — Phase 9 completed

Added the domain-neutral `AdvancedDataTable` backed by TanStack Table 8. It supports client or controlled server pagination, sorting, global filtering, column visibility and resizing, row selection, expandable rows, custom cell renderers, CSV export hooks, responsive overflow, and loading/error/empty states while retaining the existing `DataTable` compatibility API.

Added isolated Recharts line, area, bar and donut cards with accessible descriptions and visible data-table alternatives, together with trend/comparison cards and dashboard filter composition. Shared form controls now standardize React Hook Form field feedback, FastAPI server validation errors, multi-step flows, unload protection, file selection/preview and onboarding composition.

Added optional safe Markdown/code/JSON display, activity and audit views, user/team selectors and notification/dashboard composition helpers. Tiptap and React Flow remain documented lazy extension points because current backend contracts do not require them; no fake business workflow was introduced. Focused tests cover advanced table search/sort/selection/loading/error behavior, file-size rejection and trend semantics.

## 2026-11-24 — Phase 10 completed

Audited AI SDK UI, AI Elements, assistant-ui, AG-UI, Streamdown and Shiki against the repository. Retained the existing shadcn/Tailwind primitives and FastAPI authority because no current backend route exposes a verified `text/event-stream` contract; no second AI backend or competing message protocol was introduced.

Added a Zod-validated event union and reducer for run/message/tool/approval/citation/artifact/usage lifecycle events, duplicate-event protection, an SSE frame reader with abort cleanup and bounded `Last-Event-ID` reconnects, and an injectable `useAiWorkspaceStream` hook. Added isolated development fixtures and documented that they are not production functionality.

Added reusable conversation sidebar/history, composer and attachments, safe assistant Markdown, message actions, model selector, citations, tool status, approval requests, usage, memory/context controls, artifact previews and error recovery. Model output remains untrusted: no HTML or JavaScript execution is allowed, external artifact/citation URLs are restricted to HTTP(S), and sensitive actions only emit explicit user decisions for backend authorization.

## 2026-11-24 — Phase 11 completed

Added a closed Zod discriminated-union generative UI contract and registry for text, Markdown, metrics, tables, charts, comparisons, checklists, task lists, timelines, citations, file previews, forms, approvals, structured reports, workflow status and artifact cards. Recursive validation enforces payload, depth, node and child limits and rejects unknown types before rendering.

Added fixed accessible renderers that reuse shared business and AI workspace primitives. Rendering is deliberately separate from action execution: the validated action dispatcher requires an authorization callback and explicit confirmation before invoking an application callback. Unsafe URLs and arbitrary HTML/JavaScript are blocked, with an accessible fallback for invalid payloads. Added focused validation, renderer and authorization tests and documented the extension contract in `GENERATIVE_UI.md`.

## 2026-11-24 — Phase 12 completed

Added i18next/react-i18next with typed English resources and reviewed Dutch/French reference translations, persisted language preference, browser detection, an accessible shell language selector, document language/direction synchronization and RTL direction utilities. Added locale-aware date/time, number, currency, pluralization and validation helpers and routed existing shared date/currency formatting through the active locale.

Extended accessibility foundations with global visible focus indicators, coarse-pointer touch-target sizing, reduced-motion handling, translated skip-to-content labeling and axe-core smoke checks alongside the existing semantic/live-region tests. Documented keyboard, screen-reader, contrast, zoom, notification, dialog, RTL and reduced-motion manual checks and known translation limitations in `INTERNATIONALIZATION_ACCESSIBILITY.md`.

## 2026-11-24 — Phase 13 completed

Retained route-level React.lazy splitting and deferred Recharts behind named dynamic imports. Added a bounded `VirtualizedList` for long AI histories, responsive lazy artifact images, Latin/Latin-ext font subsetting, repeatable raw/gzip bundle measurement, and sampled FCP/LCP/CLS/INP monitoring that emits only local browser events. React Compiler remains disabled after an evidence-based compatibility review.

Hardened the generated PWA manifest and Workbox lifecycle with standalone install metadata, cache cleanup, client claiming, update activation, a bounded navigation fallback and no runtime API caching. Added `pwa:check` and verified a production preview in Chromium: manifest/service-worker/registration responses were 200, the service worker controlled the page and exposed update capability, offline `/reset-password` returned 200, and API CacheStorage entries remained empty. Added `PERFORMANCE_PWA.md` and updated `PERFORMANCE_BASELINE.md` with Phase 13 measurements.

## 2026-11-24 — Phase 14 completed

Added Storybook 10.6 with the React/Vite framework, a11y addon, theme/language/router decorators and deterministic MSW 3 integration. Storybook builds with `STORYBOOK=1`, which omits the application PWA plugin so the documentation build cannot create a competing service worker.

Added stories for tokens, typography, controls/dialogs, forms/uploads, responsive navigation, tables, charts, feedback states, AI conversation/stream/tool/approval/artifact states and generative UI valid/invalid/action states. Play functions cover keyboard focus, retry, dialog open/close, approval, form interaction and safe fallback behavior. Chromium smoke probes loaded Button and Generative UI stories from the static build; production code never imports the Storybook fixture handlers.

## 2026-11-24 — Phase 15 completed

Added a typed capability manifest and application configuration layer covering routes, navigation, dependency metadata, backend endpoints, runtime flags, permissions and entitlements. Added seven product presets, centralized branding/theme/language/layout configuration, build-time capability selection, deployment availability resolution and backend module-pack compatibility constants.

Integrated capability decisions into the application shell, settings navigation and route rendering. Optional pages remain lazy and are rendered only after build/deployment/server checks pass; the backend remains authoritative for access. Added configuration tests and documented Copier integration and ownership boundaries in `CONFIGURATION.md`.

## 2026-11-24 — Phase 16 completed

Added `.github/workflows/frontend-validation.yml` with locked npm/uv installs, dependency audit, ESLint, TypeScript, generated API contract verification, unit/component/axe tests, production and Storybook builds, PWA checks and enforceable gzip/asset budgets. Added a backend Ruff/pytest job and an isolated PostgreSQL/pgvector + Redis Chromium E2E job that applies migrations and never uses production data.

Added a Playwright production PWA probe for registration/control, offline navigation and zero API cache entries, plus explicit GitHub summary classification for passed, failed, skipped and blocked checks. Documented the security review and CI matrix in `SECURITY_REVIEW.md` and `TESTING_CI.md`.

## 2026-11-24 — Phase 17 completed

Updated the root and frontend README files, contributor/agent instructions, design guidance, changelog, architecture, dependency matrix, component inventory note and migration status. The active documentation now describes the semantic token/Base UI architecture, current validation commands, configuration boundaries, security rules and source ownership without directing new work to the retired component-suite path.

Added `AGENT_SKILLS.md` with Codex skill anatomy, discovery, invocation boundaries and a practical feature example. Added eleven validated `SKILL.md` workflows under `docs/frontend/agent-skills` for feature delivery, primitives, tables, forms, dashboards, AI/generative UI, API generation, accessibility, security and testing. `.agents/skills` remains the intended discovery location, but the checkout mounts it read-only; the tracked fallback can be copied there when writable.
