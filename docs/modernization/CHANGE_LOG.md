# Modernization change log

## 2026-11-24 — Phase 00 baseline

- Read `prompt.txt`, repository `AGENTS.md`, README, contributor guidance, CI, backend/frontend manifests, infrastructure, migrations, modules, and tests.
- Created the current architecture, target architecture, module boundary, technology stack, security, and data model documents.
- Created the persistent modernization plan, status ledger, backlog, dependency audit, risk register, phase records, and runbooks.
- Recorded the actual baseline: backend tests `219 passed, 4 skipped`; frontend tests `147 passed`; `make check` passed; frontend production build passed; `alembic check` passed; Compose config passed; npm audit reported six moderate findings.
- Recorded environment blockers: Docker API unavailable and no Python vulnerability scanner installed.
- No runtime code, dependency lockfile, migration, or user-authored prompt content was changed.

## 2026-11-24 — Phase 01 engineering quality baseline

- Added locked Python quality dependencies, Pyright configuration, coverage reporting, import-linter contracts, and pre-commit hooks.
- Corrected typing and import-boundary issues exposed by the new checks; existing runtime behavior remains covered by the current tests.
- Regenerated `backend/uv.lock`, including the declared RAG community loader dependency.
- Added backend quality, security, and container validation workflows; pinned existing GitHub Actions and added Renovate configuration.
- Documented why CI service containers are used instead of adding Testcontainers in this phase, and deferred Hypothesis/Schemathesis until a concrete property/contract surface warrants them.

## 2026-11-24 — Phase 02 backend architecture and API contracts

- Added formal capability metadata, dependency declarations, deployment/runtime availability, and explicit separation from authorization and entitlements.
- Moved direct route persistence behind application services and added import/AST enforcement for route boundaries and transaction ownership.
- Added RFC 9457-compatible errors, cursor/idempotency primitives, deterministic OpenAPI profiles, explicit cookie/CSRF schemes, and regenerated frontend contract artifacts.
- Added a PostgreSQL transactional outbox with versioned events, dedupe keys, retry/backoff, dead-letter handling, and durable consumer receipts; registered migration `0002_outbox`.
- Added Phase 02 contract tests and documented API/client handoff and event transaction rules.

## 2026-11-24 — Phase 05 AI infrastructure modernization

- Added application-owned provider, structured-output, tool, multimodal, usage,
  cancellation, and versioned SSE contracts.
- Modernized provider adapters for OpenAI Responses/Chat Completions,
  Anthropic Messages, OpenAI-compatible servers, local generation, and
  embeddings; added classified retries, timeouts, concurrency, and circuit
  protection.
- Added deterministic model registry/routing, optional Pydantic AI typed
  orchestration, persistent AI conversations/steps/tools/artifacts/usage, and
  additive migration `0003_ai_infrastructure`.
- Added Phase 05 tests, regenerated all-capability OpenAPI/frontend artifacts,
  and documented SSE interoperability and operational configuration.

## 2026-11-24 — Phase 06 agentic AI, tools, MCP and durable workflows

- Added bounded, resumable agent execution with step/tool/token/cost limits,
  cancellation, checkpoints, approval pauses, and failure resume endpoints.
- Added typed tool definitions and registry enforcement for permissions, tenant
  scope, side effects, timeout/retry, idempotency, approvals, and audit policy.
- Added optional deny-by-default MCP infrastructure with tenant credential
  resolution, endpoint/tool allowlists, schema validation, timeouts, lifecycle,
  audit callbacks, and untrusted external data handling.
- Added database workflow/approval/tool execution persistence, optional Temporal
  adapter, `agentic`/`durable` extras, Phase 06 tests, and migration `0004`.

## 2026-11-24 — Phase 07 advanced RAG and memory infrastructure

- Preserved existing hybrid retrieval, citation, permission, revision, and
  evaluation behavior while adding parser/safety boundaries, optional Docling,
  archive resource validation, optional clamd scanning, and ingestion progress.
- Added versioned embedding model contracts and additive variable-dimension
  pgvector chunk storage with build/activate/retire/rollback lifecycle and cost
  accounting; existing defaults remain unchanged.
- Added deterministic Recall@K, Precision@K, MRR, nDCG, citation, faithfulness,
  latency, cost, and tenant-isolation benchmark metrics.
- Added governed editable memory provenance, confidence, scope, consent, TTL,
  deduplication, correction, export, sensitive filtering, and deletion
  propagation; immutable audit records remain separate.
- Registered additive migration `0005_advanced_rag_memory` and Phase 07 tests.

## 2026-11-24 — Phase 08 reusable business capabilities

- Added tenant-aware provider-neutral storage with local/S3-compatible adapters,
  signed upload/download, ownership, quota, retention, and cleanup contracts.
- Added notification channel preferences, localization, dedupe, delivery attempts,
  retry/dead-letter state, and reusable publish/dispatch services.
- Added encrypted tenant integration credentials, scope validation, health/audit
  records, and public-DNS/HTTPS outbound URL policy.
- Added expiring scoped API keys with rotation and hash-only verification, plus
  versioned HMAC webhook signatures and idempotent delivery state.
- Added provider-neutral search/analytics ports and asynchronous product lifecycle
  jobs; PostHog remains optional and disabled by default.
- Registered additive migration `0006_reusable_capabilities` and focused Phase 08 tests.

## 2026-11-24 — Phase 09 production security, observability and deployment

- Added production configuration rejection for insecure hosts, CORS, cookies,
  logging, rate-limit, and secret settings, plus bounded request-body middleware.
- Added structured JSON logs, worker Redis-TTL health markers, queue-depth/retry
  metrics, AI cost telemetry, and webhook failure telemetry while preserving
  OpenTelemetry, Prometheus, Sentry, SQLAlchemy, and Celery instrumentation.
- Added multi-stage non-root backend image, health check, Compose migration/API/
  worker profiles, and independent worker scaling guidance.
- Added threat-model, security, deployment, backup/restore, rollback, and k6
  load-test assets with explicit Docker/k6 execution limitations.

## 2026-11-24 — Phase 10 blueprint generation and AI-assisted development

- Added a validated YAML blueprint contract, eight project profiles, capability
  dependency resolution, optional dependency groups, generated environment and
  deployment/test/worker manifests, and explicit disabled-versus-excluded state.
- Added deterministic reference-mode generation and safe generator-owned updates;
  historical migrations and user files are preserved. Billing-backed entitlements
  are evaluated through plan feature lists rather than conflated with resource
  authorization.
- Added repository-local AI development guidance for backend modules, APIs, schema,
  permissions, entitlements, AI/providers, agents/tools/MCP, workers, integrations,
  webhooks, tests, security review, and release work.
- Recorded the optional status of Copier, Spec Kit, OpenSpec, Context7, Serena,
  Repomix, GitHub MCP, and Playwright MCP; none is a runtime dependency.

## 2026-11-24 — Phase 11 final integration and production validation

- Added isolated traditional SaaS, AI knowledge platform, and agent automation
  reference configurations with capability/dependency selection assertions.
- Added reproducible generated-project lock/install checks, Compose path/environment
  fixes, deployment-image CI checks, and disposable migration/health/auth/project smoke
  coverage using local/mock providers.
- Added final validation and review runbooks, tenant-scoped organizations, and
  billing-backed entitlement evaluation. Docker-dependent evidence is delegated to CI
  because the local daemon is unavailable.

