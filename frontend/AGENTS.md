# Frontend agent instructions

## Stack and architecture
- Use React, TypeScript, Vite, Tailwind CSS v4 and the existing Base UI/shadcn-compatible primitives. Do not introduce MUI, another UI framework, or parallel styling/state systems.
- Read root `DESIGN.md` and `docs/frontend/AGENT_SKILLS.md` before UI work; use relevant repository-local skills in `.agents/skills` or the tracked fallback in `docs/frontend/agent-skills`.
- Keep features under `src/features`, API modules under `src/api`, shared query keys under `src/config`, and routes under `src/app`. Use lazy routes and existing navigation conventions.
- Keep pages thin; separate rendering, domain hooks, transport and pure utilities. Reuse shared primitives and feature components; avoid one-off wrappers and oversized components.
- Use strict TypeScript; avoid `any`, unsafe assertions and duplicated API types. Use generated OpenAPI types/SDK and existing transport adapters; never hand-edit generated files.
- Use TanStack Query for server state, local React state for UI state, and React Hook Form + Zod for forms. Reuse query keys and targeted invalidation; avoid duplicating server state.
- Keep authorization and business rules server-side; client checks are UX only. Gate features and routes using authoritative server configuration.

## Design and CSS
- `DESIGN.md` is the design specification; `src/index.css` is the global token bridge and base CSS boundary. Keep theme variables, document defaults, accessibility and browser-level primitives centralized there.
- Use semantic Tailwind tokens (`bg-background`, `text-foreground`, `border-border`, etc.) and existing variants. Keep component-specific styles in shared primitives or component utilities; do not turn `index.css` into a collection of page-specific selectors.
- Prefer reusable Base UI/shadcn-compatible components and variant definitions over repeated long class strings, custom widgets and inline styling.
- Do not add hardcoded colors, arbitrary spacing, duplicated token maps, feature CSS files or a parallel `designTokens` system without a justified need. Preserve runtime branding and light/dark theme behavior; derive values from the canonical tokens.
- Extend existing variants and shared layout primitives before creating new ones. Keep design changes synchronized across the specification, canonical CSS and affected components.

## UX, accessibility and security
- Provide loading, empty, error, success, disabled and permission states as applicable; use existing shared state components.
- Support responsive layouts, keyboard navigation, focus management, accessible labels, contrast, reduced motion and existing i18n/RTL conventions.
- Use the existing authenticated transport and CSRF handling; never store secrets in client bundles or bypass server authorization. Sanitize untrusted rendered content and validate URLs.
- Validate and allowlist AI-generated UI blocks/actions; do not render arbitrary model HTML or execute model-generated code. Protect authenticated content from inappropriate PWA caching.
- Prefer stable component contracts and measurable performance improvements; avoid unnecessary global state, effects and memoization.

## Checks
- From `frontend/`: `npm run lint`, `npm test`, `npm run build`; run targeted Vitest tests during implementation.
- On API changes: `npm run api:generate:all` and `npm run api:check`. Add component, interaction, accessibility and regression tests as appropriate.
- Verify changed UI in a browser, including relevant responsive, keyboard and theme states. Run Playwright against disposable services for changed end-to-end flows.
- Run `npm run storybook:build`, `npm run perf:check` and `npm run pwa:check` when the respective areas change.

## Styling ownership

- `src/index.css` owns static tokens, responsive layout recipes, semantic surfaces, and shared spacing. Components should use semantic Tailwind classes or the named recipes there.
- Runtime theme preferences may update CSS custom properties through `src/app/designTokens.ts`; do not duplicate static color, spacing, radius, breakpoint, or motion maps in TypeScript.
- Layout primitives expose data attributes for responsive variants. Keep grid templates and breakpoint behavior in CSS, not inline `gridTemplateColumns` or dynamically constructed Tailwind classes.
- Do not add MUI-style `sx`, `contentSx`, palette strings, or static visual inline styles. Inline styles are reserved for genuinely runtime-computed values such as chart dimensions and calendar positions.
