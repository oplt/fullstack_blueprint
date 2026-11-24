# Frontend security review

Phase 16 reviewed the frontend transport, rendering, storage, PWA and dependency boundaries. This is a release checklist, not a replacement for backend authorization or infrastructure review.

| Area | Evidence and control | Status |
| --- | --- | --- |
| Authentication token storage | `src/api/client.ts` uses credentialed cookie requests and refresh deduplication. Access/refresh tokens are not written to local storage. | Pass |
| CSRF | Mutating transport requests send the configured CSRF header; backend integration tests and disposable E2E cover cookie-authenticated writes. | Pass |
| XSS and unsafe HTML | Markdown, JSON and code viewers render bounded text; generative UI validates a closed registry and rejects arbitrary HTML/script payloads. | Pass |
| External URLs | Citation and artifact URLs are restricted to HTTP(S) before rendering or navigation. | Pass |
| Sensitive browser storage | Persisted values are limited to theme/language and non-sensitive sidebar/project identifiers. Query caches are cleared on logout and identity changes. | Pass |
| Unauthorized data exposure | Protected routes and backend services enforce authentication, roles, ownership and project membership. Capability navigation is only a visibility hint. | Pass with backend authority |
| Error-message leakage | API errors expose structured status/correlation information without credentials or provider secrets. | Pass |
| Dependency vulnerabilities | `npm run audit` enforces a zero critical/high threshold. The current lock reports six documented moderate transitive findings with no compatible fixes; backend lock and Ruff checks run in CI. | Pass with documented moderate findings |
| Environment-variable exposure | Only `VITE_*` values are bundled. Provider keys, database credentials and signing secrets remain backend/deployment settings. | Pass |
| AI-generated content | AI messages are treated as untrusted text and structured payloads use a closed registry. The action dispatcher supports injected authorization/confirmation callbacks, but no production SSE or server-issued action-capability contract is currently wired. Privileged AI actions remain disabled pending that backend boundary. | Conditional / release gate |
| PWA cache security | Workbox has no API runtime cache. CI verifies manifest, registration/control, zero API cache entries and offline navigation fallback. | Pass |

## Release interpretation

Critical and high findings block the validation workflow. Moderate transitive advisories are tracked in [DEPENDENCY_MATRIX](DEPENDENCY_MATRIX.md) and should be revisited when compatible releases exist. Optional provisioned-user, AI/RAG and admin browser suites are skipped unless their disposable credentials and services are supplied; skipped tests are reported as skipped rather than passed. The AI action-capability and SSE contract gates in the final architecture review also block production enablement of those surfaces.

The server remains authoritative for permissions, commercial entitlements, project access and document ownership. Client capability manifests can hide unavailable UI and prevent accidental route rendering, but they never grant API access.
