# Frontend Agent Instructions

All paths are relative to frontend/ unless stated otherwise.

## Stack

- React, strict TypeScript, Vite and Tailwind CSS v4.
- Existing shadcn/ui Base UI (base-nova) configuration.
- Lucide React for icons.
- TanStack Query for server state and TanStack Table for complex tables.
- React Router, React Hook Form, Zod, Sonner and Recharts.
- Reuse existing primitives and preserve local customizations.
- Do not introduce MUI, Emotion, Bootstrap, styled-components or competing styling/state systems.
- Use the existing Node version and npm lockfile.

## Design System

Apply this section when changing visual appearance, layout, styling, themes or shared UI.

- Repository-root DESIGN.md is the authoritative design specification.
- src/index.css is the authoritative executable source of static design tokens and the only application-authored global stylesheet.
- Priority: DESIGN.md -> index.css -> shared UI components -> feature components.
- Read DESIGN.md before visual changes; do not read it for unrelated logic or API fixes.
- Inspect relevant index.css tokens and affected components, not every frontend file.
- Resolve conflicting styles in favor of DESIGN.md.
- Preserve the Geist-inspired visual direction.
- Centralize reusable colors, typography, spacing, radii, shadows, motion, density, breakpoints, chart colors and layout tokens in index.css.
- Use semantic Tailwind utilities, CSS variables, cn() and existing CVA variants.
- Keep component-specific structure and layout near components.
- Do not introduce additional application stylesheets, static token maps, hardcoded palettes or independent themes.
- Avoid arbitrary visual values, dynamic Tailwind class construction and static inline styles.
- Runtime-computed geometry and validated dynamic branding values are permitted.
- Essential framework, font and third-party styles are permitted.
- Canonical token changes must propagate without rewriting feature components.

## Theme and Branding

- Maintain light/dark palettes, density and radii in index.css.
- Preserve colorMode: light, dark or system.
- Keep preference validation in src/app/theme.ts.
- Preserve document data-theme, dark class and pre-paint initialization.
- Keep application providers, Storybook and PWA metadata aligned when theme behavior changes.
- Preserve server-provided branding and configuration.

## Architecture

- src/app: routing, providers and application configuration.
- src/pages: route entry points.
- src/features: domain workflows.
- src/components: shared UI.
- src/api: API transport and adapters.
- src/config: shared query keys and timing.

Keep pages thin and responsibilities cohesive.
Shared components must not depend on features or pages.
Follow existing Dependency Cruiser boundaries.
Reuse components, hooks, forms, dialogs, tables and layout primitives.
Avoid unnecessary wrappers and parallel implementations.
Use direct named Lucide imports; do not add legacy compatibility layers.
Preserve lazy routes and optional feature boundaries.

## TypeScript and Code Quality

- Use strict typing; avoid any and unsafe assertions.
- Narrow unknown values at external boundaries.
- Use generated OpenAPI types and existing transport adapters.
- Never manually edit generated API artifacts.
- Use TanStack Query for server state, React state for local UI and existing context for shared concerns.
- Avoid duplicating server state or introducing unnecessary effects.
- Respect configured ESLint, complexity and dependency checks.
- Prefer cohesive handwritten files under 300 lines, complexity at most 10 and nesting depth at most 3.
- Refactor oversized files only when required by the task or an applicable enforced check.
- Generated artifacts and canonical index.css are exempt from handwritten file-size guidance.
- Remove confirmed obsolete code within the affected scope.
- Do not treat disabled optional capabilities as dead code.

## Performance

- Preserve route-level lazy loading and tree shaking.
- Keep heavy optional dependencies off unrelated initial routes.
- Prevent duplicate requests, avoidable waterfalls and excessive rerenders.
- Use shared query keys and targeted invalidation.
- Cancel obsolete requests and stop polling inactive or terminal operations.
- Clean up timers, subscriptions and streams.
- Preserve AI streaming responsiveness and event ordering.
- Optimize assets and fonts where relevant.
- Memoize or virtualize when justified.
- Use scripts/check-bundle-size.mjs as the authoritative bundle budget.
- Benchmark only when performance or bundle behavior is materially affected.
- Do not claim performance gains without measurements.

## UX and Security

- Preserve loading, empty, error, disabled and permission states.
- Prevent duplicate submissions.
- Target WCAG 2.2 AA with semantic HTML, accessible names, keyboard navigation, focus management, contrast and reduced motion.
- Preserve responsive layouts, light/dark themes and existing internationalization.
- Use existing authenticated transport and CSRF handling.
- Client-side permission checks are UX controls, not authorization.
- Disabled features must not mount or fetch protected data.
- Prevent authenticated cache leakage between users and project scopes.
- Sanitize untrusted content and validate URLs.
- Allowlist AI-generated UI blocks and actions; never execute arbitrary generated HTML or code.
- Protect authenticated data from inappropriate service-worker caching.

## Validation

Apply the global validation policy.
Run only checks relevant to the actual change.

- Local logic changes: focused Vitest tests and affected lint checks.
- Type or interface changes: npm run typecheck when needed.
- Visual changes: inspect affected styles and relevant browser/component behavior.
- API contract changes: npm run api:generate:all and npm run api:check.
- Dependency or dead-code cleanup: relevant Knip or audit checks.
- Architecture changes: applicable Dependency Cruiser and duplication checks.
- Shared UI or theme changes: targeted component/accessibility and browser checks.
- Performance changes: npm run perf:measure and npm run perf:check with a production build when needed.
- PWA changes: npm run pwa:check and relevant browser checks.
- Critical integration changes: relevant Playwright tests against disposable services.

Available broader commands:

- npm run lint
- npm run typecheck
- npm test
- npm run build
- npm run storybook:build
- npm run knip
- npm run knip:production
- npm run audit
- npm run test:e2e
- npm run pwa:browser

These are not a mandatory completion checklist.
Run the applicable full gates for frontend-wide refactors, release preparation or changes with broad impact.
Do not install dependencies or browsers when existing tooling is sufficient.