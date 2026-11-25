# AI and agents

Enable `AI_ENABLED=true` and enable AI in the platform module configuration. This module provides prompt templates and versions, generation runs, provider metadata, usage, reviews, and evaluations. Agents run one turn at a time and persist the run and trace.

The local heuristic provider supports development without credentials. Configure a production model and provider explicitly. Optional RAG and memory context enter generation through `PromptContextService`. The RAG module owns document storage, parsing, indexing, and retrieval. With RAG enabled, the AI document routes delegate to it through the compatibility service.

Phase 06 adds a bounded `AgentRuntime` and `TypedToolRegistry`. Tool definitions
declare schemas, permissions, tenant scope, side-effect class, timeout/retry,
idempotency, approval, and audit policy. Authorization is checked immediately
before execution; model-provided tool names never grant access. Agent workflow
definitions and checkpoints are user/tenant scoped and resumable through the
`/agent/workflow-runs` endpoints. Sensitive tools pause for an approval bound to
the immutable parameter hash, tenant, workflow, and expiration.

MCP is optional and deny-by-default. Configure `AI_MCP_ENABLED`,
`AI_MCP_SERVERS_JSON`, and host/tool allowlists before using the SDK adapter.
Administrative, database, filesystem, shell, and unrestricted execution tools
are filtered, tenant credentials are resolved at call time, and external tool
metadata/results are marked untrusted. The default database workflow backend
does not require Temporal; install the `durable` extra only when deploying the
optional Temporal adapter. Celery remains the default for ordinary background
jobs.

Use `backend/.venv/bin/python -m pytest backend/modules/ai/tests` from the repository root.
