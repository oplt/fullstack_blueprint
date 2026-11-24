---
name: create-generative-ui-component
description: Add an allowlisted, Zod-validated generative UI block or action renderer for Fullstack Blueprint AI surfaces.
---

# Create generative UI component

## Purpose
Render bounded model-produced content through fixed React components with safe fallback behavior.

## Required architecture
Extend the closed schemas, registry, and fixed renderers under `features/ai/generative-ui`; route actions through `actions/actionDispatcher.ts` and backend authorization.

## File-placement rules
Schemas and limits belong in `features/ai/generative-ui/schemas`; renderers in `registry`; generic display blocks can reuse `components/ui`. Never accept arbitrary component/module names.

## Implementation workflow
Define a discriminated Zod schema, apply payload/node/depth/row limits, register a fixed renderer, validate HTTP(S) URLs, add safe fallback and explicit confirmation for actions, then document a deterministic story.

## Reference components
Use `validation.ts`, `registry`, fixed renderers, `actionDispatcher.ts`, and existing generative UI stories/tests.

## Required tests
Test valid/invalid/oversized/recursive payloads, unknown types, URL handling, renderer fallback, confirmation and denied actions, axe semantics, and Storybook play behavior.

## Security requirements
No arbitrary HTML/JSX/JavaScript/module loading, no model-granted permissions, no unsafe URL schemes, and no direct side-effect callback without backend-aligned authorization.

## Accessibility requirements
Every renderer has semantic headings/labels, text alternatives for charts, keyboard actions, visible focus, and a clear accessible fallback.

## Acceptance criteria
Only registered schemas render, limits are enforced, invalid content is harmless, actions require confirmation/authorization, and tests pass.

## Common mistakes to avoid
Avoid `dangerouslySetInnerHTML`, `eval`, dynamic imports from model data, unbounded recursion, and color-only status.
