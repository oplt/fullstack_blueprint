# Blueprint frontend

Product presets, typed capability manifests, branding and generated-application configuration live in [`docs/frontend/CONFIGURATION.md`](../docs/frontend/CONFIGURATION.md). Use `AppProviders`' `configuration` prop for Copier-generated overrides; use `VITE_BLUEPRINT_CAPABILITIES` for build-time capability selection.

React and TypeScript frontend using Vite, the canonical CSS-variable design system, and shared Tailwind/Base UI primitives. See [`DESIGN.md`](../DESIGN.md) for the token contract and the [repository README](../README.md) for setup and development commands.

Static design tokens and shared styling recipes live in [`src/index.css`](src/index.css). Runtime theme preferences in `src/app/designTokens.ts` only project validated user/configuration choices into CSS custom properties. Responsive layout primitives use CSS data-attribute variants so breakpoint behavior stays centralized and statically discoverable.

The shared primitive layer is configured in [`components.json`](components.json), uses Base UI with Tailwind CSS v4, and exposes typed components from `src/components/ui`. Use `cn()` from `src/lib/utils.ts` for class composition and import the canonical aliases with `@/*`.

```sh
npm ci
npm run lint
npx tsc -b
npm test
npm run build
npm run api:generate:all
npm run api:check
npm run audit
npm run storybook:build
npm run perf:check
npm run pwa:check
```

Use a disposable backend for Playwright. The authenticated shell and shared UI live in `src/app` and `src/components`. Features and corresponding API clients live in `src/features` and `src/api`.

The API contract workflow exports FastAPI with all optional routers enabled, then generates the Hey API SDK and TypeScript models into `src/api/generated`. Generated files must not be edited manually. `api:check` regenerates the contract in a temporary directory and fails when the committed OpenAPI document or generated artifacts drift. Runtime calls continue through `src/api/client.ts` so cookies, CSRF, refresh deduplication, cancellation and structured errors retain their existing behavior.

## Source layout and references

- `src/app` owns providers, routes, capability gating, and the authenticated shell.
- `src/components/ui` owns reusable Base UI/shadcn-compatible primitives; `src/components` owns domain-neutral compositions.
- `src/features/<domain>` owns pages, hooks, and domain components; route entries are lazy and registered centrally.
- `src/api` owns transport, generated contracts, adapters, and query-facing API modules; `src/config` owns query keys and timing.

Read [the architecture guide](../docs/frontend/ARCHITECTURE.md), [configuration guide](../docs/frontend/CONFIGURATION.md), [testing and CI guide](../docs/frontend/TESTING_CI.md), [security review](../docs/frontend/SECURITY_REVIEW.md), and [Agent Skills](../docs/frontend/AGENT_SKILLS.md) before adding a feature.
