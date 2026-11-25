# Frontend agent instructions

## 1. Scope and workflow

- These instructions apply to `frontend/`. Follow root `AGENTS.md` and any applicable nested instructions. Paths below are relative to `frontend/` unless explicitly identified as repository-root paths.
- Treat the application as a reusable full-stack blueprint, not a single-purpose product. Preserve optional capabilities, branding, clone configuration, and existing feature boundaries.
- Before editing, inspect the relevant implementation, consumers, tests, manifests, configuration, and CI failures. Read root `DESIGN.md` before UI work. Consult repository-local agent skills and frontend guidance when present; do not assume missing documentation exists.
- Preserve unrelated working-tree changes. Make cohesive, reviewable changes; avoid speculative rewrites. Fix root causes, remove superseded implementations after migration, and add regression tests for corrected defects.
- Do not change backend contracts, business rules, authorization, database state, or infrastructure unless the task requires a coordinated change. Never reset databases or delete volumes without explicit authorization.

## 2. Approved stack

- Use React, strict TypeScript, Vite, Tailwind CSS v4, and the existing shadcn/ui Base UI (`base-nova`) configuration in `components.json`.
- Use Lucide React for icons, TanStack Query for server state, TanStack Table for advanced tables, React Router for routing, React Hook Form + Zod for forms, Sonner for toasts, and Recharts for charts where needed.
- Prefer existing shadcn primitives and supported composition patterns. Preserve meaningful local customizations; do not blindly overwrite components with generated registry code.
- Do not introduce MUI, Emotion, styled-components, Bootstrap, another UI framework, parallel styling or state systems, or redundant libraries.
- Add dependencies only when existing capabilities cannot reasonably solve the problem. Use the repository's Node version and npm lockfile; update dependencies through npm, not manual lockfile edits. Avoid unrelated upgrades.

## 3. Design-system ownership (mandatory)

- Repository-root `DESIGN.md` is the authoritative human-readable design specification. `src/index.css` is the authoritative executable source of static application design tokens and the only application-authored global stylesheet.
- Keep both synchronized. Implement the current `DESIGN.md`, including its Geist-inspired default visual direction, rather than preserving conflicting legacy palettes. Adapt marketing-oriented guidance to application surfaces without inventing a second visual identity.
- Centralize static colors, semantic surfaces, typography, spacing, breakpoints, radii, shadows, motion, control sizes, layout widths, stacking layers, chart colors, table density, and theme variants in `index.css` using CSS custom properties and Tailwind v4's CSS-first architecture.
- Use semantic Tailwind utilities such as `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `border-border`, `ring-ring`, and `text-destructive`. Define reusable component variants with the existing `cn()` utility and class-variance-authority where appropriate.
- Keep component composition and local structural Tailwind utilities near their components. Centralize reusable responsive layout recipes, not page-specific selectors. Do not turn `index.css` into a collection of feature styles.
- Do not create additional application CSS files, static TypeScript token maps, hardcoded visual palettes, duplicated spacing scales, or independent theme systems. Essential font, framework, and third-party styles are permitted but must not define a competing application theme.
- Prefer named tokens over arbitrary visual values. Use literal dimensions only when intrinsic to a component's geometry or behavior and not a reusable design decision.
- Keep responsive behavior in CSS using media/container queries and complete, statically discoverable Tailwind classes. Do not construct Tailwind class names dynamically or use inline responsive grid definitions.
- Do not introduce `sx`, `contentSx`, MUI palette strings, legacy responsive style objects, or static visual inline styles. Inline styles are limited to genuinely runtime-computed geometry or validated dynamic branding values.
- A change to canonical CSS tokens must propagate to consuming components without editing feature code. Keep Storybook, charts, and application shells consistent with the same tokens; synchronize necessary build-time metadata such as PWA colors without creating another runtime theme.

## 4. Runtime theme and branding

- Keep light and dark palettes, density, and radii in `index.css`. The supported user preference is `colorMode` (light, dark, or system).
- Keep stored preference validation in `src/app/theme.ts`. Ignore obsolete keys and resolve system mode from the browser preference.
- Apply the resolved mode through the document's `data-theme` attribute and `dark` class. Keep pre-paint initialization, React providers and Storybook aligned. Preserve server-provided branding and configuration contracts.

## 5. Architecture and component ownership

- Keep routing, providers and application configuration under `src/app`; route entry points under `src/pages`; domain workflows under `src/features`; shared components under `src/components`; transport and API adapters under `src/api`; shared query keys and timing under `src/config`.
- Keep pages thin. Separate view composition, domain hooks, forms, mutations, pure calculations, data transformations and API communication by responsibility.
- Shared UI primitives must not depend on feature modules or pages. Avoid circular dependencies and unauthorized cross-feature imports; follow the existing Dependency Cruiser configuration. Expose narrow, stable interfaces where features must interact.
- Reuse existing components, layout primitives, variants and hooks before adding new ones. Prefer composition over large prop-driven components. Extract modules only when they have a coherent responsibility; avoid trivial wrappers and excessive fragmentation.
- Maintain one canonical implementation per shared UI responsibility. Consolidate genuinely overlapping tables, forms, feedback, navigation, dialogs and layout utilities; preserve distinct behaviors where justified.
- Prefer a shared TanStack Table foundation for complex tables. Preserve client/server pagination, sorting, selection, filtering, expansion, sticky columns, density and accessibility where supported. Search and sort typed data through accessors, not rendered JSX; avoid duplicating server-side processing.
- Import named icons directly from `lucide-react`. Migrate legacy `iconsCompat` consumers and remove the compatibility module when unused. Standardize icon sizing and alignment; provide accessible names for icon-only controls.
- Do not introduce new legacy compatibility layers. Transitional adapters must have a concrete migration purpose and be removed when no longer needed.
- Use lazy routes and authoritative application configuration to gate optional capabilities. Disabled features must not mount, fetch protected data, or remain accessible through unintended routes. Client-side checks are UX controls, not authorization.

## 6. Code quality and TypeScript

- Write readable, consistently formatted source. Keep imports, statements and JSX properly separated; remove obsolete comments, empty statements and commented-out implementations. Follow the repository formatter when configured.
- Aim for 100–250 physical lines per handwritten implementation file. Respect the existing ESLint target of 300 nonblank, noncomment lines. Split handwritten implementation files exceeding 400 physical lines into cohesive modules before completion.
- Keep cyclomatic complexity at or below 10, nesting depth at or below 3, and function parameters preferably at or below 5. Use early returns, typed lookup tables, focused helpers and discriminated unions rather than deeply nested logic.
- Never compress source, manipulate line counts, or distribute code into arbitrary wrappers to bypass quality checks. Generated API artifacts, generated service workers, lockfiles and other genuinely generated artifacts are exempt from handwritten-source limits. `src/index.css` is exempt from the 400-line limit to preserve canonical ownership; keep it concise regardless.
- Use strict TypeScript. Avoid `any`, unsafe assertions, unnecessary non-null assertions, duplicated API models and broad unvalidated dynamic objects. Narrow `unknown` at external boundaries and validate untrusted input.
- Use generated OpenAPI types/SDKs through existing transport adapters. Never hand-edit generated files. Scope generated-code lint exclusions narrowly; retain contract and compilation checks.
- Use TanStack Query for server state, local React state for UI state, and existing context for genuinely shared concerns. Do not duplicate server data in local state or introduce unnecessary effects or global stores.
- Do not suppress lint or type errors to conceal defects. Keep existing quality thresholds intact; document narrow, justified exceptions where genuinely necessary.

## 7. Dead code and dependency hygiene

- Use Knip to detect unused files, exports, types and dependencies; use existing Dependency Cruiser and duplication checks to identify architectural violations and repeated logic.
- Verify findings against static and dynamic imports, lazy routes, tests, Storybook, PWA/build entry points, feature flags, configuration, generated clients and blueprint generation before deleting anything.
- Disabled optional capabilities are not dead code. Do not remove required transitive dependencies or useful public extension points simply because a scanner cannot identify their consumers.
- Remove confirmed obsolete code, redundant wrappers, unused assets, stale exports, retired MUI compatibility code and dependencies after migrating consumers. Consolidate overlapping libraries when behavior and compatibility can be preserved.
- Keep manifests, lockfiles, tests, documentation and imports synchronized. Correct scanner configuration rather than broadly ignoring actionable findings.

## 8. Performance

- Measure before and after substantial optimization using equivalent production builds and representative browser journeys. Do not claim gains without evidence.
- Preserve route-level lazy loading. Keep heavy optional AI, RAG, agent, memory, charts and editor dependencies off unrelated initial routes. Inspect actual chunks before changing Vite chunking; preserve tree shaking and use named icon imports.
- Load only necessary font families, weights and subsets consistent with `DESIGN.md`. Optimize assets and keep development mocks and Storybook out of production bundles.
- Avoid unnecessary context updates, repeated calculations, unstable keys, excessive DOM nesting, layout thrashing and unnecessary effects. Memoize or virtualize only when profiling or referential requirements justify it.
- Reuse query keys and targeted invalidation. Prevent duplicate requests and avoidable waterfalls; parallelize independent queries, cancel obsolete requests where supported, and stop polling terminal runs or inactive features. Preserve freshness and correctness.
- Clean up timers, subscriptions and streams. Keep high-frequency AI streaming updates responsive without losing events or changing their ordering semantics.
- Respect existing bundle budgets in `scripts/check-bundle-size.mjs`; do not raise them to conceal regressions. Current defaults are 1,200,000 bytes total gzip, 400,000 bytes JS gzip, 35,000 bytes CSS gzip and 60 JS/CSS assets. Treat the checked-in budget script as authoritative.
- Aim for good Core Web Vitals at the 75th percentile of field data (LCP <= 2.5s, INP <= 200ms, CLS <= 0.1). Distinguish lab proxies from field measurements and report environmental limitations.

## 9. UX, accessibility and internationalization

- Provide applicable loading, empty, error, success, disabled and permission states using shared components. Prevent duplicate submissions and preserve meaningful feedback during asynchronous operations.
- Target WCAG 2.2 AA: semantic HTML, correctly associated form labels, accessible names, keyboard navigation, visible focus, focus restoration, dialog focus management, status announcements, contrast, touch targets and reduced motion.
- Validate responsive layouts, including narrow mobile, tablet and desktop widths, long content, table overflow, navigation and dialogs. Do not hide essential functionality at smaller widths.
- Preserve existing i18n, locale formatting, language preferences and RTL conventions. Use the translation infrastructure where applicable rather than introducing hardcoded user-facing text.
- Verify shared components and changed pages in both light and dark modes and relevant density settings. Use Storybook and axe-core for component-level accessibility checks and browser tests for real interaction behavior.

## 10. Security and contract integrity

- The backend owns authorization, business rules, entitlements and tenancy boundaries. Use the existing authenticated transport and CSRF handling; never bypass server controls or expose secrets in client bundles.
- Preserve session refresh, logout, authentication redirects and permission behavior. Prevent authenticated query-cache leakage between users, organizations and project scopes.
- Sanitize untrusted rendered content and validate URLs. Validate and allowlist AI-generated UI blocks and actions; never render arbitrary model HTML or execute model-generated code.
- Protect authenticated data from inappropriate PWA/service-worker caching. Preserve existing cache and update policies unless a verified defect requires a change.
- Preserve API contracts and generated artifacts. Investigate dependency audit findings and apply compatible fixes; do not blindly force major upgrades or weaken security gates.

## 11. Validation and quality gates

- Inspect `package.json`, CI workflows and repository commands before running checks. Install locked dependencies with `npm ci` when needed; do not assume unconfigured tools or scripts exist.
- During implementation, run focused Vitest tests. Before completing substantive frontend changes, run from `frontend/`:
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
  - `npm run build`
- Run additional checks according to the changed areas:
  - API contracts: `npm run api:generate:all` when contracts change, then `npm run api:check`.
  - Cleanup/dependencies: `npm run knip`, `npm run knip:production`, and `npm run audit` as applicable; use existing Dependency Cruiser and duplication checks for architectural changes.
  - Shared UI/themes: `npm run storybook:build`, relevant axe-core/component tests, and browser verification.
  - Performance/bundling: `npm run perf:measure` and `npm run perf:check` after a production build.
  - PWA/build/cache changes: `npm run pwa:check` and `npm run pwa:browser` with required browser/services available.
  - Critical user journeys: `npm run test:e2e` against disposable services; include auth, authorization, navigation and affected domain flows.
  - Substantial cross-stack changes: applicable root `make check`, integration tests and existing CI gates.
- For significant frontend-wide refactoring, run all applicable gates above and verify representative full-feature and minimal/disabled-capability configurations.
- Add regression tests for fixed bugs and tests for changed contracts, shared components, theme ownership and security-sensitive behavior. Preserve meaningful coverage.
- Fix actual application defects rather than increasing timeouts, weakening assertions, skipping tests, removing coverage or lowering thresholds. Update test selectors only for legitimate changes to accessible behavior.
- Prefer existing tooling for architecture enforcement. Maintain checks for forbidden legacy imports, static token duplication, handwritten file size, complexity, unused code and invalid dependencies. Keep exclusions narrow and avoid brittle checks that reject legitimate runtime values.
- Do not claim a check passed unless it ran successfully. Report failures, skipped checks and verified blockers separately, including pre-existing failures. Do not silently bypass CI gates.

## 12. Completion criteria

- The requested behavior is implemented, obsolete code is removed, affected consumers are migrated, and no new parallel architecture is introduced.
- Design changes remain consistent with `DESIGN.md` and `index.css`; the default UI can be restyled through canonical tokens without rewriting reusable feature components.
- Changed handwritten implementation code meets size, complexity, typing and dependency rules. Preserve intended blueprint capabilities and security boundaries.
- Relevant documentation, tests, configuration and lockfiles are current. Report changes, validation results, measurable performance effects where applicable, and unresolved blockers or justified deviations.