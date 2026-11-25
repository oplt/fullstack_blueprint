# Phase 11 — Final integration and production validation

Status: `IN_PROGRESS`

Scope: isolated reference applications, generated-project install/start validation,
cross-stack smoke tests, deployment image checks, and final production review.

## Delivered

- Added three reference configurations under
  [`docs/validation/reference-apps`](../../validation/reference-apps/README.md):
  traditional SaaS, AI knowledge platform, and agent automation platform.
- Added a deterministic `reference-apps` CLI command and `make phase11-check` target
  that generate isolated projects, validate required/forbidden capabilities, and write
  a machine-readable report outside the repository.
- Fixed generated Compose files so deployment services consume `.env.generated` and
  resolve repository infrastructure paths from the generated `deployment/` directory.
- Added locked dependency, Compose, image-build, migration, health, authentication,
  and representative project-operation checks to the Phase 11 CI workflow.
- Added the final validation runbook and review checklist.

## Reference application matrix

| Application | Profile | Result | Notes |
| --- | --- | --- | --- |
| Traditional SaaS | `lean_saas` | Generated and statically validated | AI/RAG excluded; billing remains provider-neutral/mock |
| AI knowledge platform | `knowledge_base` | Generated and statically validated | AI/RAG/memory/storage/billing selected; providers remain local/mock |
| Agent automation platform | `automation` | Generated and statically validated | Organizations are tenant-scoped; MCP is enabled without an external server |

## Commands and evidence

```bash
make phase11-check
PYTHONPATH=. backend/.venv/bin/python -m backend.blueprint.cli reference-apps \
  --output /tmp/phase11-reference-apps
```

The generated fixtures passed locked-project resolution, Compose configuration, and
reference selection checks in this environment. The full runtime matrix is defined in
`.github/workflows/phase11-reference-validation.yml` and
[`phase11-final-validation.md`](../../runbooks/phase11-final-validation.md).

## Open release gates

- Docker is unavailable locally, so disposable PostgreSQL/Redis startup, migrations,
  API/worker health, auth/project smoke tests, and image builds require CI or a
  Docker-enabled host.
- Payment processing remains provider-neutral and mock-only in the reference fixtures;
  no real financial transaction is created during validation.
- Product-specific usage quota enforcement remains separate from AI/runtime budgets and
  is a product implementation requirement for applications that need it.
- Existing technical-debt items, dependency advisories, and migration risks remain
  tracked in the modernization backlog and risk register.

