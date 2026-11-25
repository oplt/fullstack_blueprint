# Phase 05 — AI infrastructure modernization

Status: `VERIFIED`

## Objective and boundary

The AI module now provides a provider-independent application layer. Existing
AI Studio prompt/version/run/evaluation and RAG compatibility paths remain
available; provider SDK and wire-format details stop at `modules/ai/providers.py`.
RAG remains the owner of document ingestion, indexing, retrieval, and evidence
revisions.

## Delivered contract

- `backend/modules/ai/contracts.py` defines application-owned messages,
  multimodal parts, tools, usage, provider requests/responses, capabilities,
  and versioned stream events.
- `AiProviderRegistry` preserves the legacy `generate`/`embed_texts` surface and
  adds contract generation/streaming. Adapters cover the local heuristic
  provider, OpenAI Responses API, OpenAI Chat Completions compatibility,
  Anthropic Messages, embeddings, and OpenAI-compatible local servers.
- Provider failures are classified as configuration, authentication, rate
  limit, timeout, cancellation, invalid request, structured-output, transient,
  circuit-open, or provider errors. Secrets and response bodies are not copied
  into error messages.
- `ModelRegistry` and `RoutingPolicy` select deterministically by task,
  capability, provider/model request, cost, latency, reliability, and region.
  No AI-selected fallback or duplicate side effect is used.
- `PydanticAiOrchestrator` is an application-owned optional adapter for typed
  structured output. It is installed through the `ai` extra and does not leak
  Pydantic AI types into unrelated modules. Direct adapters remain authoritative
  for streaming, embeddings, multimodal payloads, and compatible servers.

## Persistence and accounting

Migration `0003_ai_infrastructure` adds additive fields to `ai_runs` for tenant,
provider request ID, routing/residency, retry, and redacted input hash. It adds
user-scoped conversations/messages/parts, operational run steps, idempotent
tool calls, artifacts, and usage records. No hidden chain-of-thought field is
present; run steps hold summaries and operational metadata only.

Generation services attribute usage and estimated cost to the user, tenant
(currently the authenticated user fallback), provider, model, and run. Prompt
version pricing is interpreted as cost per million tokens and converted to
micro-units before persistence.

## Streaming protocol

`POST /api/v1/ai/stream` returns `text/event-stream` with
`X-AI-Stream-Protocol: 1`. Events are JSON payloads with a stable `type`,
`protocol_version`, `run_id`, monotonic `sequence`, and timestamp:

`run.started`, `text.delta`, `structured.output`, `tool.call`, `tool.result`,
`artifact`, `usage`, `approval.required`, `heartbeat`, `run.completed`,
`run.failed`, and `run.cancelled`.

The transport is intentionally generic SSE, so a frontend may map it to the
Vercel AI SDK, assistant-ui, AG-UI, or a custom client. The backend does not
depend on any of those UI SDKs. Disconnect cancellation closes the provider
stream and finalizes the persisted run as cancelled; heartbeat frames prevent
idle proxy timeouts.

## Reliability and configuration

The default configuration is AI-disabled and local-provider safe. Hosted
providers are enabled only when configured. Relevant settings are
`AI_OPENAI_API_MODE`, `AI_RETRY_MAX_ATTEMPTS`, `AI_REQUEST_TIMEOUT_SECONDS`,
`AI_MAX_CONCURRENT_REQUESTS`, circuit-breaker thresholds/cooldown,
`AI_STREAM_HEARTBEAT_SECONDS`, `AI_MODEL_REGISTRY_JSON`, region allowlists,
`AI_ALLOWED_REGIONS`, `AI_TENANT_MAX_COST_MICROS`, `AI_COMPATIBLE_BASE_URL`,
and `AI_ORCHESTRATOR`.

Retry only applies to classified transient/rate-limit/timeout failures. The
in-process circuit breaker and concurrency limiter are deliberately modest
process-local protections; shared provider quotas and tenant budget enforcement
remain deployment policy inputs for the later worker/operations phases.

## Verification

- Phase tests: routing constraints/cost, error classification, structured
  output, SSE framing/stream completion, and retained RAG/route behavior pass.
- `alembic history` reaches `0003_ai_infrastructure`; offline PostgreSQL SQL
  generation succeeds through the new head.
- Frontend OpenAPI artifacts were regenerated from the all-capabilities schema.
- Docker-backed disposable PostgreSQL/pgvector and live provider tests remain
  environment-gated because Docker is unavailable in this execution context.

## Rollback and handoff

Deploy the migration before enabling the AI stream route. Disable `AI_ENABLED`
or select `AI_DEFAULT_PROVIDER=local` to stop hosted calls without changing
data. Do not downgrade `0003_ai_infrastructure`; it intentionally refuses a
destructive rollback so run/audit/cost history is retained. Phase 06 owns
durable worker retries and cross-process idempotency; Phase 07 owns shared
provider/tenant budget telemetry and alerting.
