# Risk register

Risk levels: `P0` blocks production or creates material security/correctness exposure; `P1` is core architecture/productivity risk; `P2` is scale/reuse/operational debt.

| ID | Level | Risk | Evidence | Mitigation / rollback | Status |
| --- | --- | --- | --- | --- | --- |
| R-001 | P0 | Webhook SSRF/DNS rebinding can bypass the validation decision between DNS resolution and request | `webhook_service.py` resolves a hostname, then `httpx` connects by hostname | Introduce pinned/revalidated egress adapter, keep current webhook behavior behind tests, roll back adapter via config if provider compatibility fails | `OPEN` |
| R-002 | P0 | Plaintext TOTP/webhook secrets increase blast radius of database/operator compromise | `mfa_secret` and webhook `secret` are normal string columns | Envelope-encrypt with key rotation; migrate in place; retain decrypt compatibility during rollback | `OPEN` |
| R-003 | P0 | Concurrent user subscription creation can violate the service's one-subscription assumption | No unique constraint on `user_subscriptions.user_id`; repository uses `scalar_one_or_none()` | Audit duplicates, add unique constraint/index, make selection idempotent, rollback by restoring migration backup | `OPEN` |
| R-004 | P1 | Direct router commits/SQL make transaction and authorization review inconsistent | Direct `db.commit()` in admin, notifications, platform, settings, and users routers | Move writes to services and add static convention test; preserve API responses | `OPEN` |
| R-005 | P1 | Import cycles make startup/runtime coupling harder to reason about | Conservative AST scan found two multi-module cycles | Define composition roots, inject job/telemetry ports, add cycle check | `OPEN` |
| R-006 | P1 | Project/organization IDs without foreign keys allow orphaned references | RAG/memory models use `String` identifiers; organization model is absent | Add compatible constraints after orphan inventory or document external ownership; never delete data automatically | `OPEN` |
| R-007 | P1 | A single non-downgradeable baseline revision is risky once data exists | Only `0001_blueprint`; `downgrade()` raises | Establish additive revision policy, backup/restore runbook, and disposable migration CI | `OPEN` |
| R-008 | P1 | Multiple inheritance in services can hide dependencies and create fragile MRO behavior | Platform and AI services inherit other services | Replace with composition/ports incrementally with contract tests | `OPEN` |
| R-009 | P2 | Moderate frontend transitive advisories remain unresolved | `npm audit --json` reports six moderate findings | Track upstream fixes and review expiry; no force upgrade | `OPEN` |
| R-010 | P2 | Audit/retrieval trace retention is not operationally defined | Timestamped tables exist without retention policy/runbook | Define retention, archive, legal hold, and purge metrics | `OPEN` |
| R-011 | P2 | Docker runtime validation was not possible in this environment | Docker API permission denied | Execute Compose and disposable pgvector checks in CI or an approved environment | `BLOCKED` |

