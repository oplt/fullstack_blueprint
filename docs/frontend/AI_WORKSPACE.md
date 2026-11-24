# AI workspace architecture

Phase 10 adds a reusable end-user AI workspace under `frontend/src/features/ai/workspace` while preserving the existing AI Studio, RAG, memory and agent routes.

## Technology decision

The repository audit considered AI SDK UI, AI Elements, assistant-ui, AG-UI, Streamdown and Shiki. None can provide production streaming behavior without a verified backend event endpoint, and adding a second message/state protocol would duplicate the existing FastAPI authority. The workspace therefore uses the existing React/Tailwind primitives, the safe `MarkdownRenderer`/`CodeViewer` blocks, and an injectable stream connector. A future AI SDK UI integration can implement the same connector boundary without changing workspace components.

No Node.js AI backend was added. Browser requests remain cookie-authenticated through `apiFetchStream`; provider credentials never enter the client.

## Event contract

`types.ts` defines and validates the allowlisted event union:

`run_started`, `message_started`, `text_delta`, `tool_call_started`, `tool_call_completed`, `approval_requested`, `approval_resolved`, `citation_added`, `artifact_created`, `usage_updated`, `run_completed`, `run_cancelled`, and `run_failed`.

`streaming.ts` parses SSE frames, supports multiline JSON data, abort cleanup, `Last-Event-ID` reconnects and bounded retry attempts. `reducer.ts` applies only validated events and de-duplicates server event IDs. The hook exposes explicit `start`, `cancel` and `reset` operations; it never invents tool activity, citations, costs, reasoning or run metadata.

The current FastAPI contract exposes JSON AI/RAG/agent routes and ingestion/evaluation job polling, but no `text/event-stream` route or event schema. `connectAiStream` is consequently an injectable boundary rather than a production endpoint, and `fixtures.ts` is development-only. Production callers must supply a verified backend connector and event schema before enabling streaming.

## Reusable workspace blocks

The workspace exports conversation navigation/history, message composition and cancellation, safe assistant/user messages, model selection, attachments, source citations, tool status, approval requests, usage indicators, artifact previews, memory controls, context inspection and error recovery. Markdown and artifact URLs are treated as untrusted: HTML is never injected, executable content is not rendered, and external URLs are limited to HTTP(S).

Sensitive actions are represented by `HumanApprovalRequest`; the component only emits the user's decision. Authorization and execution must remain backend responsibilities.

