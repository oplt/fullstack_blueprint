# Phase 09 — Production security, observability and deployment

Status: `VERIFIED`

Scope: production security posture, correlated telemetry, health/worker operations,
reproducible load testing, backups/restores, and deploy/rollback controls.

## Delivered

- Added production startup validation for explicit hosts/CORS, secure cookies,
  JSON logs, fail-closed rate limits, and high-entropy secrets.
- Added bounded request bodies, trusted-host handling, structured redaction, and
  production-safe rate-limit failure behavior.
- Preserved and extended OpenTelemetry, Prometheus, Sentry, SQLAlchemy, Celery,
  AI, RAG, pool, queue-depth, retry, webhook-failure, and AI-cost instrumentation
  without tenant/user metric labels.
- Added Redis-TTL worker health markers, `/health/workers`, readiness integration,
  queue-depth monitoring, and graceful shutdown markers.
- Replaced the runtime image with a builder/runtime Docker flow, non-root execution,
  image health checks, migration job, API service, and independently scalable worker.
- Added isolated backup/restore scripts with explicit restore confirmation, a k6
  load-test scenario, security threat model, and deployment/operations runbooks.

## Evidence and limitations

- Backend security/worker tests, static checks, OpenAPI checks, and frontend build
  are run as part of the Phase 09 validation pass.
- The k6 scenario records thresholds but was not executed here because k6 and the
  Docker daemon are unavailable; no performance numbers are invented.
- Backup/restore commands are documented and guarded, but isolated PostgreSQL/
  pgvector execution is deferred to CI/deployment because Docker is unavailable.
- Langfuse, Loki, Uptime Kuma, Coolify, Dokploy, managed services, and OpenTofu
  remain optional deployment evaluations; no mandatory Kubernetes dependency was added.

