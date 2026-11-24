# Frontend Agent Skills

This repository ships reusable, project-local Codex skills intended for [`.agents/skills`](../../.agents/skills). In this checkout that directory is mounted read-only, so the complete tracked skill set lives in [`docs/frontend/agent-skills`](agent-skills) as a portable fallback; copy those folders to `.agents/skills` when the repository mount is writable. A skill is a folder with a required `SKILL.md`; its YAML frontmatter contains a lowercase `name` and a discriminating `description`, and its body contains only the workflow-specific guidance an agent needs. This follows the local Codex skill-creator convention. Optional `agents/openai.yaml`, scripts, references, and assets are added only when they provide a concrete benefit.

## Discovery and invocation

Codex-compatible agents discover project skills from `.agents/skills/<skill-name>/SKILL.md`. Use a skill explicitly with `$skill-name` or let the agent select it from the description. Skills do not replace `AGENTS.md`, backend authorization, CSRF, feature flags, or deployment policy. They are instructions for implementation and review inside this repository, not permission to perform external mutations.

When the repository mount is writable, install the tracked fallback with `mkdir -p .agents/skills && cp -R docs/frontend/agent-skills/. .agents/skills/`.

| Skill | Use it for |
| --- | --- |
| `frontend-feature` | A complete domain feature crossing API, query, route, navigation, and UI boundaries. |
| `create-ui-component` | A reusable Base UI/Tailwind primitive or domain-neutral composition. |
| `create-data-table` | Sorting, filtering, pagination, selection, responsive tables, or CSV export. |
| `create-form` | React Hook Form + Zod forms and FastAPI validation handling. |
| `create-dashboard` | Responsive metric, chart, activity, and filter compositions. |
| `create-ai-interface` | AI workspace/chat/tool/approval UI with typed backend events. |
| `create-generative-ui-component` | Validated, allowlisted model-generated UI blocks and actions. |
| `generate-api-client` | OpenAPI export, generated SDK/types, and transport adapters. |
| `frontend-accessibility-review` | Keyboard, focus, semantics, contrast, motion, RTL, and axe review. |
| `frontend-security-review` | Cookie/CSRF, XSS, URL, storage, authorization, AI, and PWA cache review. |
| `frontend-testing` | Unit/component/axe, Storybook, contract, build, PWA, and disposable-service E2E validation. |

## Practical example

For a new project-member table, invoke `$frontend-feature` to establish the route and API ownership, then `$create-data-table` for the table implementation, `$create-form` if inline editing is needed, and `$frontend-testing` for the validation matrix. The feature should end up under `frontend/src/features/projects`, call a typed module under `frontend/src/api`, use query keys from `frontend/src/config/queryKeys.ts`, register a lazy route in `frontend/src/app/routes.ts`, and expose loading, error, empty, translated, keyboard, and permission states. The backend remains the authority for membership access and mutation authorization.

## Required handoff

Every skill user should report changed files, tests run, and any passed/failed/skipped/infrastructure-blocked checks. Generated API output is never hand-edited, secrets never enter client bundles, and browser tests use disposable services. Keep this index and the skill descriptions synchronized when workflows or source ownership change.
