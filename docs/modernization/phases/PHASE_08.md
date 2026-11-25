# Phase 08 — Reusable business capabilities

Status: `VERIFIED`

Scope: provider-neutral storage, notifications, integrations, API keys, webhooks,
search, analytics, and product data lifecycle services.

## Delivered

- Added tenant-aware storage records and a provider port with S3/MinIO-compatible,
  local, signed upload/download, quota, retention, ownership, and cleanup behavior.
- Added reusable notification channel persistence with preferences, localization,
  deduplication, delivery attempts, retries, and dead-letter status.
- Added an integration registry with encrypted credentials, scopes, health checks,
  revocation, audit records, and HTTPS/public-DNS outbound URL policy.
- Added scoped, expiring, rate-limited API-key metadata and rotation/revocation;
  only hashes are persisted and plaintext is returned once at creation/rotation.
- Added versioned HMAC webhook signatures, replay checks, idempotent delivery
  records, retry backoff, and dead-letter state.
- Added provider-neutral search and privacy-minimized analytics ports. PostgreSQL
  remains the default search substrate; dedicated search infrastructure is deferred
  until measured workload justifies it. PostHog is optional and disabled by default.
- Added asynchronous lifecycle job contracts for export, import, account deletion,
  and organization deletion. Legal retention/erasure policy remains deployment-owned
  and destructive operations require an explicit product/legal decision.

## Validation and limitations

- Focused Phase 08 capability tests pass, existing platform/notification tests pass,
  and the additive Alembic head renders successfully offline.
- Docker is unavailable in this environment, so disposable PostgreSQL/pgvector and
  live provider integration checks remain a CI/deployment responsibility.
- Expensive lifecycle work and external notification/webhook transport are queued
  state machines; workers supply the transport/runner implementation.

