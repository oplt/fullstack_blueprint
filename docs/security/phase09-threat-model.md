# Phase 09 threat-model review

The review covers the application as a cookie-authenticated modular monolith behind
an optional trusted reverse proxy. It is an engineering control review, not a formal
compliance certification.

| Threat | Control | Residual risk / owner |
| --- | --- | --- |
| Broken access control and cross-tenant leakage | Route services scope retrieval by authenticated user/project/tenant; RAG and memory enforce boundaries at retrieval/indexing | Add organization-wide authorization review in future policy work |
| Authentication bypass and session fixation | Signed access tokens are checked against active refresh sessions; refresh rotates and revokes the old session; password reset revokes all sessions | Incident response must revoke sessions after credential compromise |
| CSRF and CORS abuse | Unsafe cookie writes require the CSRF cookie/header pair; production requires explicit HTTPS CORS origins | Same-site deployment topology must remain documented |
| SQL injection | SQLAlchemy expressions and parameterized text health queries; no user SQL execution surface | Review new raw SQL in code review |
| SSRF and webhook forgery | HTTPS/allowlist/public-DNS validation, redirects disabled for webhook delivery, signed versioned payloads, replay limits, idempotent deliveries | Egress firewall and DNS pinning remain deployment controls |
| Insecure uploads | Request-size limits, file-type/size validation in RAG and storage, private object storage, signed URLs, optional malware scanning | Enable required malware scanning for untrusted production uploads |
| Secret exposure | Fernet-encrypted integration credentials, hash-only API keys, redacting log filter, no request-body logging | Rotate JWT/encryption roots through secret management |
| Denial of service and rate-limit bypass | Bounded bodies, Redis-backed public/auth/AI/API-key limits, production fail-closed mode, bounded AI/tool budgets | Redis availability is part of the production SLO |
| Prompt injection and unauthorized tool execution | RAG untrusted-data handling, typed tool permissions, tenant checks, approvals, side-effect/idempotency policies | Review each newly registered tool |
| Excessive resource consumption | DB pool budgets, request/AI/file limits, worker late acknowledgements, task time limits, queue metrics | Tune limits from measured load tests |
| Supply-chain vulnerabilities | Locked uv/npm dependencies, pip-audit/npm audit/Trivy/CodeQL workflows, pinned CI actions | Run scheduled dependency updates |

Production startup rejects insecure cookie, CORS, host, rate-limit, logging, and
secret settings in `backend/core/config.py`. OWASP-aligned review areas are tracked
here; this does not claim that a scanner or penetration test was performed.
