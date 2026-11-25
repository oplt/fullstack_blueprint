# Phase 11 reference applications

These configurations are deliberately provider-neutral and are generated outside
the repository. They are integration fixtures, not product claims.

| Application | Profile | Covered capabilities | Explicit limitation |
| --- | --- | --- | --- |
| Traditional SaaS | `lean_saas` | Identity, organizations, projects, billing, entitlements, feature flags, notifications, analytics, baseline audit logs | Payment processing remains provider-neutral/mock |
| AI knowledge platform | `knowledge_base` | Identity, projects, AI, conversations/runs, RAG, ingestion, storage, memory, billing | Providers use local/mock settings; AI cost telemetry is available, but product-specific usage metering remains product work |
| Agent automation platform | `automation` | Identity, organizations, AI agents, typed tools, MCP boundary, durable workflows, integrations, approvals, notifications | MCP is enabled without an external server; usage limits use AI/runtime budgets rather than a product-specific quota service |

Generate all three into an external directory:

```bash
make phase11-check
# or:
PYTHONPATH=. backend/.venv/bin/python -m backend.blueprint.cli reference-apps \
  --output /tmp/phase11-reference-apps
```

For each generated application, the release matrix is:

```bash
cd backend && uv sync --locked --all-extras
uv lock --check --project /tmp/phase11-reference-apps/traditional-saas/backend
docker compose -f /tmp/phase11-reference-apps/traditional-saas/deployment/docker-compose.yml config
docker compose -f /tmp/phase11-reference-apps/traditional-saas/deployment/docker-compose.yml up -d postgres redis
docker compose -f /tmp/phase11-reference-apps/traditional-saas/deployment/docker-compose.yml --profile ops run --rm migrate
docker compose -f /tmp/phase11-reference-apps/traditional-saas/deployment/docker-compose.yml --profile app up -d api worker
curl --fail --retry 30 http://127.0.0.1:8000/health/ready
```

Generated Compose builds pass the resolved optional groups to the image's
`UV_EXTRAS` build argument, so AI/RAG/memory/agentic/durable dependencies are
installed only for fixtures that select them.

Use isolated Compose project names and remove only those disposable validation
resources after the run. Never use the cleanup commands against a shared environment.
