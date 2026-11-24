---
name: generate-api-client
description: Refresh the Fullstack Blueprint OpenAPI contract and generated TypeScript client/types without hand-editing generated output.
---

# Generate API client

## Purpose
Keep frontend API types synchronized with the all-optional FastAPI contract and shared credentialed transport.

## Required architecture
The backend export script is the contract authority; generated files live in `frontend/src/api/generated`; runtime calls use `src/api/client.ts`, adapters, and feature API modules.

## File-placement rules
Never hand-edit `src/api/generated`. Put normalization in `src/api/adapters`, domain calls in `src/api`, and query keys in `src/config/queryKeys.ts`.

## Implementation workflow
Run `npm run api:export`, `npm run api:generate`, and `npm run api:check` from `frontend`; inspect schema/status/nullable/multipart/422 changes; update adapters and tests; review generated diff for accidental secrets or unrelated churn.

## Reference components
Use `frontend/scripts/export-openapi.mjs`, `src/api/client.ts`, `src/api/transport`, generated indexes, and API contract tests.

## Required tests
Run contract freshness, TypeScript, transport tests for cookies/CSRF/204/422/abort, affected feature tests, and a production build.

## Security requirements
Do not embed credentials in schemas or fixtures, preserve cookie/CSRF/refresh behavior, and ensure backend authorization remains required for every operation.

## Accessibility requirements
Generated types do not remove UI obligations: adapters and feature consumers must retain labels, errors, loading, empty, and retry states.

## Acceptance criteria
Contract and generated artifacts are deterministic and fresh, runtime uses the shared client, no generated file is manually patched, and checks pass.

## Common mistakes to avoid
Do not call generated fetch functions directly around auth, commit temporary exports, ignore nullable fields/status 204, or broaden optional routers accidentally.
