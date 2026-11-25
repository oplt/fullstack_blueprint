# Phase 06 — Agentic AI, tools, MCP and durable workflows

Status: `VERIFIED`

## Delivered architecture

- `agent_runtime.py` provides bounded, resumable execution with model/tool
  selection, context assembly, iterative tool calls, checkpoints, cancellation,
  timeouts, maximum steps, token/cost/tool-call budgets, approval pauses, and
  failure state.
- `agent_contracts.py` and `tool_registry.py` define typed input/output
  schemas, permissions, tenant restrictions, side-effect classes, timeouts,
  retry policy, idempotency, approval, and audit policy. Registry authorization
  happens immediately before the handler; model output never grants permission.
- `agent_workflow_service.py` persists user/tenant-scoped agent definitions,
  workflow state, checkpoints, approvals, and tool execution receipts. Unique
  idempotency keys and immutable action hashes prevent uncontrolled replay.
- Existing `/agent/runs` remains compatible. New definition/workflow endpoints
  support start, inspect, approve/resume, generic resume after supported failure,
  and cancellation.

## Tool policy

Tools are classified as read-only, data-modifying, external communication,
financial, or destructive. Only explicitly registered tools are callable. The
default registry exposes only harmless `core.echo` and `core.join` examples;
module integrations should register their own handlers with required permissions
and least-privilege tenant policy. Read-only tools may retry according to their
declared policy; side-effecting tools are not automatically retried.

Approvals bind the tool identifier/version, canonical parameter hash, tenant,
workflow execution context, authenticated approver, and expiration. Approval
records are persisted and checked again during resume.

## MCP boundary

`mcp.py` provides an optional maintained MCP SDK adapter through the `agentic`
extra. It supports configured streamable HTTP servers, discovery, schema
validation, tenant credential resolution, endpoint/tool allowlists, timeouts,
connection lifecycle, policy filtering, and audit callbacks. Production
endpoints require HTTPS. Administrative, database, filesystem, shell, and
unrestricted execution tools are never automatically exposed. MCP descriptions
and results are bounded and marked untrusted data, never instructions.

The blueprint does not expose administration, database access, or filesystem
operations as MCP tools. External MCP tools must still be wrapped in the typed
registry when they are made available to an agent.

## Workflow strategy

The application-owned `WorkflowPort` has a database checkpoint backend as the
default and an optional `TemporalWorkflowBackend` adapter behind the `durable`
extra. Temporal is appropriate for long-running timers, external events,
approvals, and restart recovery, but is not required by the lightweight
application. Celery remains responsible for ordinary email, ingestion, memory,
notification, webhook, and maintenance jobs; no global Celery replacement was
introduced. LangGraph was evaluated and not installed because the bounded
runtime plus Pydantic AI provider boundary meets the current graph needs without
adding a second agent framework.

## Persistence

Migration `0004_agentic_workflows` adds agent definitions, workflow runs,
checkpoint history, approval records, tool execution receipts, and MCP server
configuration metadata. Secrets are represented only by credential references;
tenant credentials are resolved at connection time and are not stored in model
state or prompt context.

## Verification and limitations

- Phase tests cover typed authorization/output validation, multi-step execution,
  max-step boundedness, approval pause/resume, idempotent action hashing, MCP
  allowlists, schema validation, and untrusted result handling.
- Existing agent history/RAG/AI tests remain covered.
- Alembic offline PostgreSQL SQL generation reaches `0004_agentic_workflows`.
- Docker-backed PostgreSQL/pgvector and live MCP/Temporal integration tests are
  environment-gated because Docker and external services are unavailable here.

Disable `AI_ENABLED` or leave `AI_MCP_ENABLED=false` to keep the lightweight
deployment behavior. Do not downgrade the agentic migration; workflow and audit
history must be retained. The next operational phase should add cross-process
workflow monitoring, queue metrics, and shared tenant spend alerts.
