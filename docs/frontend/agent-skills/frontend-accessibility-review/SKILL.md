---
name: frontend-accessibility-review
description: Review a frontend change for keyboard, focus, semantics, contrast, motion, RTL, touch, and automated axe accessibility requirements.
---

# Frontend accessibility review

## Purpose
Find and fix barriers in a feature or shared component before release.

## Required architecture
Review the actual component route, Base UI primitive composition, i18n resources, responsive token usage, and Storybook/axe harness rather than a screenshot alone.

## File-placement rules
Keep fixes with the owning feature/component; add shared behavior to `components/ui`; put manual findings in the relevant frontend QA document, not production code comments.

## Implementation workflow
Trace landmarks and headings, labels/descriptions/errors, keyboard and focus order, dialog/menu semantics, live regions, contrast/status, zoom/reflow, reduced motion, RTL, and coarse-pointer targets. Re-run axe and behavior tests.

## Reference components
Use `SkipToContentLink`, `QueryBoundary`, Base UI dialogs/fields, i18n direction helpers, `responsiveQa`, and `.storybook` a11y configuration.

## Required tests
Add/adjust axe smoke and keyboard tests, Storybook a11y/interaction coverage, and Playwright checks for critical focus/navigation paths.

## Security requirements
Do not “fix” accessibility by exposing secrets, bypassing authorization, or injecting raw HTML for labels/content.

## Accessibility requirements
Target WCAG 2.2 AA, preserve visible focus and text alternatives, announce async status/errors, support keyboard and reduced motion, and never rely on color alone.

## Acceptance criteria
No critical axe violations, all interactive paths are keyboard reachable, focus is restored predictably, responsive/RTL behavior is documented, and remaining manual gates are explicit.

## Common mistakes to avoid
Avoid placeholder-only labels, positive tabindex, focus traps without escape/restore, hover-only help, tiny targets, and asserting axe alone proves usability.
