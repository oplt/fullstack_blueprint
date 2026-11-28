# Configuration ownership and precedence

The application has one architecture. Optional capabilities change deployment
availability and runtime behavior; they do not select a different application
implementation.

## Ownership

- Deployment settings and secrets are environment-owned and validated by
  `core/config.py`.
- Runtime application settings are validated database-backed settings owned by
  the admin module.
- AI, RAG, and memory settings remain owned by their respective modules and
  are projected from the validated deployment settings.
- Capability availability is authoritative in `core/features.py`. The public
  platform metadata endpoint exposes its manifest to clients.
- Rollout feature flags are account-facing runtime data owned by the admin
  module. They never replace server-side authorization or capability checks.
- User preferences remain identity-owned.

## Deterministic precedence

1. Deployment environment values are loaded into `Settings` and validate the
   process configuration.
2. Database-backed runtime settings override the corresponding runtime
   defaults, but cannot change deployment-disabled capability flags or secrets.
3. The capability registry evaluates deployment flags and dependencies.
4. Platform module-pack settings and explicit database overrides select the
   enabled subset from capabilities already available in the deployment.
5. Feature flags may narrow rollout behavior for an authorized user; they can
   never grant access to an unavailable capability or unauthorized resource.
6. Frontends consume the public platform metadata response and do not infer
   authoritative availability independently.

The configuration editor only writes validated `.env` values in development.
It is disabled in production; secret values are redacted in responses and are
not included in audit or application logs.
