---
name: frontend-testing
description: Plan and run Fullstack Blueprint frontend unit, component, axe, Storybook, contract, build, PWA, performance, and disposable-service E2E validation.
---

# Frontend testing

## Purpose
Give a change an evidence-backed validation matrix instead of a single green command.

## Required architecture
Match tests to ownership: Vitest for pure/hooks/components, axe for semantics, Storybook for deterministic visual states, contract scripts for generated API, and Playwright for real browser/service boundaries.

## File-placement rules
Colocate unit/component tests with source, stories beside reusable components, browser specs under `frontend/e2e`, and reusable fixtures under test/storybook fixture modules—not production imports.

## Implementation workflow
Run lint, `tsc -b`, focused Vitest then full `npm test -- --run`, axe/storybook, `api:check`, production build, `perf:check`, `pwa:check`, and disposable-service Chromium E2E as applicable. Record passed, failed, skipped, and infrastructure-blocked results separately.

## Reference components
Use `vitest.config.ts`, `playwright.config.ts`, `.storybook`, `scripts/check-pwa-browser.mjs`, `scripts/check-bundle-size.mjs`, and the CI workflow.

## Required tests
Cover changed behavior plus loading/error/empty, permissions, keyboard, abort/invalidation, mobile, and security-sensitive boundaries. Add browser coverage for auth/navigation/PWA changes.

## Security requirements
Use disposable credentials/services, never production data, keep API caches out of PWA tests, and avoid printing tokens or connection strings in failure artifacts.

## Accessibility requirements
Include axe where markup changes, keyboard/focus assertions for interactive changes, translated/error states, reduced-motion and responsive checks for shared UI.

## Acceptance criteria
The test matrix is proportional to risk, failures are reproducible, generated contracts/builds are fresh, and the handoff reports exact commands and classifications.

## Common mistakes to avoid
Do not test only snapshots, rely on Storybook mocks for production authorization, call live services from unit tests, or label an unavailable browser service as a product failure.
