---
name: frontend-security-review
description: Review frontend changes for cookies/CSRF, XSS, URL, storage, authorization, AI content, dependency, and PWA cache risks.
---

# Frontend security review

## Purpose
Verify that browser code preserves server authority and does not create new token, injection, privacy, or cache exposure.

## Required architecture
Trace the shared API client, configuration/capability gates, feature route, service worker, generated contract, and any AI/generative renderer involved.

## File-placement rules
Put transport/security helpers in `src/api` or `src/security` when they are truly shared; keep feature policy in its feature folder and document release findings in `docs/frontend/SECURITY_REVIEW.md`.

## Implementation workflow
Check cookie credentials and CSRF on writes, refresh/session cleanup, XSS/Markdown/URL handling, localStorage contents, server-authoritative permissions, AI output/actions, public env values, dependency audit, and no runtime API caching in PWA.

## Reference components
Use `api/client.ts`, `configuration/capabilities.ts`, `generative-ui/validation.ts`, `actionDispatcher.ts`, service-worker config, and the existing security review.

## Required tests
Run transport/security unit tests, generative UI safety tests, `npm audit --audit-level=high`, contract/build checks, and browser PWA probe confirming zero API CacheStorage entries.

## Security requirements
Never store access/refresh tokens in web storage, trust hidden UI, execute model content, allow unsafe URL schemes, log secrets, or expose server-only settings through `VITE_*`.

## Accessibility requirements
Security states such as denied, expired, and re-authentication must be visible, translated, keyboard reachable, and announced without leaking sensitive details.

## Acceptance criteria
Every mutation has CSRF/session protection, every resource has backend authorization, untrusted content is bounded/sanitized, caches exclude API data, and findings are classified with owners.

## Common mistakes to avoid
Do not add a second auth path, use client capability as permission, cache authenticated responses for offline use, or suppress errors that help users recover safely.
