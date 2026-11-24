---
name: create-form
description: Implement React Hook Form and Zod forms that integrate with FastAPI validation, CSRF transport, i18n, and mutation invalidation.
---

# Create form

## Purpose
Create predictable forms with client validation, server error mapping, pending protection, and accessible fields.

## Required architecture
Use React Hook Form, Zod/resolvers, shared `formControls`, and the API client. Keep schemas and submit adapters in the feature.

## File-placement rules
Place form components/schemas under `features/<domain>`, API calls under `src/api`, and query keys/invalidation in `src/config` and feature hooks.

## Implementation workflow
Model the backend schema, define translated Zod messages, compose labelled fields, map FastAPI 422 details with `formErrors`, submit through the credentialed client, prevent duplicate submits, invalidate queries, and reset only after success.

## Reference components
Use `formControls`, `FormGrid`, profile/project forms, file-upload helpers, and `utils/formErrors`.

## Required tests
Cover client validation, server 422 mapping, pending/retry, keyboard submission, reset/cancel, dirty navigation protection, and axe labels/descriptions.

## Security requirements
Use shared CSRF handling; never persist credentials/tokens. Validate files, URLs, and rich text at boundaries and rely on server authorization.

## Accessibility requirements
Inputs have labels and stable error/description IDs, errors are announced, focus reaches the first actionable error, and touch targets are usable.

## Acceptance criteria
Client/server validation agree, errors survive locale changes, duplicate submits are impossible, cache state is correct, and checks pass.

## Common mistakes to avoid
Do not hand-roll uncontrolled inputs, swallow 422 details, navigate before success, or duplicate auth/CSRF logic.
