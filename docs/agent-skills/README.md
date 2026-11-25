# Repository-local AI development skills

These skills are portable fallback instructions for coding agents. They do not
grant permission to send messages, change external systems, bypass authorization,
or put secrets in source. Follow the root `AGENTS.md`, then select the narrowest
skill that matches the work. Every change still requires tests, security review,
tenant-boundary review, and a concise handoff.

| Skill | Use |
| --- | --- |
| `backend-module` | Add a modular-monolith domain module |
| `api-endpoint` | Add a route/service/repository API contract |
| `database-model-migration` | Add a model and additive Alembic revision |
| `organization-feature` | Add organization/tenant-scoped behavior |
| `permission` | Add or change authorization permissions |
| `entitlement` | Add a subscription/feature entitlement |
| `ai-provider` | Add an AI provider adapter |
| `agent-tool` | Add a typed agent tool |
| `mcp-integration` | Add an MCP server/tool integration |
| `background-task` | Add a Celery or durable background task |
| `external-integration` | Add an outbound provider integration |
| `webhook` | Add a signed webhook event/delivery |
| `tests` | Add or update regression/contract tests |
| `security-review` | Review a change against the threat model |
| `release` | Prepare a migration/deployment/release handoff |
