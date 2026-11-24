# Generative UI

Phase 11 adds a bounded, schema-driven renderer for structured AI output at `features/ai/generative-ui`.

## Contract

The frontend accepts `{ version: 1, components: [...] }`. Every component is parsed with a Zod discriminated union and must use one of the closed registry types: text, markdown, metric, data table, chart, comparison, checklist, task list, timeline, citations, file preview, form, approval request, structured report, workflow status, or artifact card.

Unknown types, malformed fields, unsafe URLs and oversized/deep payloads are rejected. The renderer displays one accessible fallback alert rather than attempting to interpret arbitrary JSX, HTML, JavaScript, module names or CSS. Markdown and code are rendered as React text; no HTML injection path exists.

## Rendering and actions

`GenerativeUiRenderer` maps registry keys to fixed renderers that reuse the shared table, chart, timeline, citation, artifact, form and approval primitives. This registry is intentionally not extensible from model output. The visual tree is separate from action execution: forms, approvals and artifact buttons emit a validated action only through an injected `ActionDispatcher`.

`examples.ts` contains backend-independent, story-ready overview and report payloads so visual documentation can exercise the renderer without a live model or API.

`createGenerativeActionDispatcher` requires backend-aligned authorization and, by default, explicit user confirmation before invoking an application callback. The frontend does not grant permissions or call arbitrary tools; the backend must re-authorize every action against the current user, project membership and resource policy.

## Limits and extension

Payloads are capped at 200 KB, 120 rendered nodes, four nesting levels, 20 children per node, and bounded field/row counts. Add a new component by changing the Zod schema, registry and fixed renderer together, with validation, accessibility and security tests. Do not add an evaluator for arbitrary component names or raw markup.
