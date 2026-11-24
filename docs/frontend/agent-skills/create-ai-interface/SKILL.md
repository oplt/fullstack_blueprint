---
name: create-ai-interface
description: Build AI workspace interfaces with typed events, safe rendering, approvals, citations, and an injectable connector boundary.
---

# Create AI interface

## Purpose
Add AI conversation or tool UI without fabricating a production stream endpoint or weakening backend authority.

## Required architecture
Use `features/ai/workspace` types, reducer, streaming boundary, safe message/artifact components, and injected connectors. Existing AI Studio/RAG/agent JSON contracts remain the source of truth.

## File-placement rules
Put AI-specific components under `features/ai`; keep generic conversation blocks in the workspace folder and transport adapters in `src/api`.

## Implementation workflow
Verify the backend event/JSON contract, validate events with Zod, make reducers duplicate-safe and cancellable, show tool status/citations/usage, require explicit approval for side effects, and provide unavailable/error/retry states.

## Reference components
Use `workspace/types.ts`, `streaming.ts`, `useAiWorkspaceStream`, conversation/composer/approval/artifact components, and isolated fixtures.

## Required tests
Cover event parsing, duplicate/reconnect bounds, cancellation, safe markdown/URLs, approval transitions, citations, loading/error, and axe/live-region behavior.

## Security requirements
Never execute model text, HTML, URLs, tools, or actions directly. Enforce server authorization and tenant scope, redact sensitive previews, and do not log prompts/tokens.

## Accessibility requirements
Use labelled composer controls, keyboard approval actions, live response/tool status, focus recovery, reduced motion, and readable streaming fallbacks.

## Acceptance criteria
Malformed/unavailable events fail safely, approvals cannot be bypassed, reconnects are bounded, and no endpoint is invented.

## Common mistakes to avoid
Do not ship fixture data in production, parse arbitrary SSE payloads, auto-run model actions, or treat hidden UI as permission.
