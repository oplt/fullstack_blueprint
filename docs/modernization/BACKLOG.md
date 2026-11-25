# Modernization backlog

Statuses: `NOT_STARTED`, `IN_PROGRESS`, `IMPLEMENTED`, `VERIFIED`, `BLOCKED`, `DEFERRED`.

## P0 — security, correctness, production blockers

| ID | Item | Evidence | Acceptance criteria | Status |
| --- | --- | --- | --- | --- |
| P0-SEC-01 | Prevent webhook SSRF and DNS rebinding | `backend/modules/platform/webhook_service.py` validates DNS, then sends a later request by hostname | Egress client pins/revalidates approved public destinations, blocks private/link-local/metadata ranges, has timeout/redirect tests, and documents production allow-list | `NOT_STARTED` |
| P0-SEC-02 | Encrypt sensitive MFA and webhook secrets at rest | `users.mfa_secret` and `webhook_endpoints.secret` are plaintext columns | Envelope encryption, key source/rotation runbook, additive migration, and no-secret-response regression tests | `NOT_STARTED` |
| P0-DATA-01 | Make subscription cardinality race-safe | `PlatformRepository.get_subscription_for_user` assumes one row but `user_subscriptions.user_id` is not unique | Audit duplicates, add a safe unique constraint/index, handle concurrent selection, and verify on disposable PostgreSQL | `NOT_STARTED` |

## P1 — core architecture and productivity

| ID | Item | Evidence | Acceptance criteria | Status |
| --- | --- | --- | --- | --- |
| P1-ARCH-01 | Standardize route -> service -> repository/port | Several routers call `db.commit()` or direct SQL | All business writes have service-owned transaction boundaries; route scan and tests enforce the rule | `NOT_STARTED` |
| P1-ARCH-02 | Break static import cycles | AST scan found session/observability and worker/task cycles | Approved dependency scan reports no forbidden cycles; startup and all tests pass | `NOT_STARTED` |
| P1-ARCH-03 | Replace capability-service inheritance with composition | `PlatformService` and AI services use multiple inheritance | Explicit collaborators/ports preserve route contracts and cache/audit timing | `NOT_STARTED` |
| P1-DATA-01 | Clarify project/organization reference integrity | RAG and memory project identifiers are strings; cross-domain references remain loosely coupled | Add compatible project FKs or documented adapter ownership, plus ACL and orphan tests | `NOT_STARTED` |
| P1-DATA-02 | Replace baseline-only migration strategy | One `0001_blueprint` revision; downgrade raises | Future revisions are additive, reviewable, tested on disposable pgvector PostgreSQL, and have rollback/recovery notes | `NOT_STARTED` |
| P1-AI-01 | Consolidate AI document compatibility ownership | Legacy `/ai/documents*` delegates into RAG | One RAG application port owns ingestion/retrieval; compatibility routes remain contract-tested | `NOT_STARTED` |
| P1-OPS-01 | Add disposable-service validation to local/CI workflow | Compose config validates but Docker runtime was blocked here | CI runs migration, readiness, API smoke, and worker checks against isolated services | `NOT_STARTED` |

## P2 — reuse and scale

| ID | Item | Evidence | Acceptance criteria | Status |
| --- | --- | --- | --- | --- |
| P2-DATA-01 | Add database checks/enums for role/status/interval fields | Several lifecycle fields are unconstrained strings | Inventory values, add compatible checks, and document migration/rollback | `NOT_STARTED` |
| P2-OPS-01 | Add retention policies for audit and retrieval traces | Audit/retrieval records have timestamps but no retention runbook | Retention windows, archive/delete jobs, legal hold behavior, and metrics are documented | `NOT_STARTED` |
| P2-SCALE-01 | Measure connection budgets and queue capacity | Pool math exists in `db/session.py`; no live load gate in baseline | Load profile validates API/worker pools, PgBouncer guidance, queue delay, and RAG latency budgets | `NOT_STARTED` |
| P2-DEP-01 | Reduce moderate frontend dependency advisories | npm audit reports six moderate vulnerabilities with no automatic fix | Upgrade compatible dependency paths or document accepted risk with expiry | `NOT_STARTED` |
| P2-PACK-01 | Package blueprint generation and clean-room validation | Repository is a reusable blueprint but packaging checks are manual | Clean generated checkout passes install, migration, contract, build, and smoke checks | `NOT_STARTED` |

