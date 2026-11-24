---
name: create-ui-component
description: Create a reusable accessible Base UI/Tailwind primitive or domain-neutral frontend composition for Fullstack Blueprint.
---

# Create UI component

## Purpose
Add a composable component that can be reused without importing a product feature or API.

## Required architecture
Use Base UI/shadcn-compatible primitives, semantic CSS variables, Tailwind utilities, `cn()`, and typed CVA variants. Keep behavior controlled through props and callbacks.

## File-placement rules
Primitive code belongs in `frontend/src/components/ui`; domain-neutral blocks belong in `src/components`. Add a colocated test and Storybook story for shared components.

## Implementation workflow
Find a similar primitive, define a small typed API, compose label/description/error IDs, add semantic variants, then document normal, loading, error, empty, disabled, and responsive states.

## Reference components
Use `src/components/ui/Button`, `Dialog`, `Field`, `EmptyState`, `QueryBoundary`, `AdvancedDataTable`, and `.storybook` decorators.

## Required tests
Test keyboard behavior, controlled updates, disabled/pending state, focus restoration, and an axe smoke render. Add a deterministic Storybook story for non-trivial behavior.

## Security requirements
Do not render unsanitized HTML, accept arbitrary URLs, or include API calls in a shared primitive. Hidden/disabled UI is not server authorization.

## Accessibility requirements
Prefer native semantics, explicit names/descriptions, visible focus, logical tab order, escape/arrow behavior, touch sizing, reduced motion, and RTL-safe layout.

## Acceptance criteria
No feature imports, token-compliant styling, keyboard/screen-reader usability, tests/story, and no unnecessary core-bundle dependency.

## Common mistakes to avoid
Avoid raw hex values, CSS-in-JS, product query props, unnamed icon buttons, and color-only status.
