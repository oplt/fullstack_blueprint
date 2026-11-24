---
name: frontend-feature
description: Implement a complete Fullstack Blueprint frontend feature across API, query, route, navigation, capability, and UI boundaries.
---

# Frontend feature

## Purpose
Deliver a vertical slice that preserves the modular-monolith ownership model and existing URLs.

## Required architecture
Start from the FastAPI contract and server authorization. Put transport in `frontend/src/api`, query keys in `src/config/queryKeys.ts`, domain code in `src/features/<domain>`, and lazy route metadata in `src/app/routes.ts`/`router.tsx`. Use configuration capability gating without treating it as authorization.

## File-placement rules
Keep reusable primitives in `src/components/ui`, domain-neutral compositions in `src/components`, and page-specific code in the feature folder. Never edit `src/api/generated` manually.

## Implementation workflow
Inspect backend routes and schemas, add typed API methods and query/mutation hooks, compose loading/error/empty states, add the lazy route and navigation entry, then wire capability/permission visibility. Preserve cookies, CSRF, abort signals, invalidation, i18n, and responsive semantics.

## Reference components
Use `features/projects`, `app/routes.ts`, `components/ui/QueryBoundary`, `AdvancedDataTable`, `formControls`, and `configuration/capabilities.ts`.

## Required tests
Add focused Vitest/component tests, an axe smoke test, and Playwright coverage when the flow crosses auth, navigation, or browser APIs.

## Security requirements
Backend checks are authoritative; use the shared credentialed client and CSRF on writes. Never store tokens or secrets in client configuration.

## Accessibility requirements
Use semantic headings/landmarks, labelled controls, visible focus, keyboard paths, live async status, comfortable targets, reduced motion, and translated status/error text.

## Acceptance criteria
The route deep-links and recovers from errors, unauthorized users cannot mutate data, capability-off builds hide the surface, query cancellation/invalidation works, and lint/types/tests/build pass.

## Common mistakes to avoid
Do not create a second API client, duplicate query keys, bypass `ProtectedRoute`, or invent an endpoint/event that the backend does not expose.
