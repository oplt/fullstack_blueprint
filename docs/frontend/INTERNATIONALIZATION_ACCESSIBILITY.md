# Internationalization and accessibility

Phase 12 establishes the locale and WCAG 2.2 AA foundations used by the frontend.

## Internationalization

`src/i18n/config.ts` initializes i18next/react-i18next with English as the complete primary namespace and Dutch/French reference translations. The selected language is detected from the persisted `fullstack-blueprint.language` preference, then the browser language, and finally English. `LanguageSelector` is available in the authenticated shell. Changes update `document.documentElement.lang` and `dir`; the direction helper already supports RTL languages when a future locale is added.

Use the shared `formatDate`, `formatDateTime`, `formatNumber`, `formatCurrency` and `localizeValidationIssue` helpers rather than `toLocaleString` or hardcoded validation text in reusable code. i18next plural keys use `_one`/`_other` and interpolate counts. Existing notification/date helpers now use the active locale.

Dutch and French intentionally cover the shell, language control, common actions, statuses and validation messages. Missing feature-specific keys fall back to English until their translations are reviewed by a language owner; they are not presented as complete production translations.

## Accessibility verification

- Semantic landmarks, skip-to-content, focus-visible outlines, minimum touch targets and reduced-motion CSS are part of the shared layer.
- Base UI dialogs provide focus trapping/restoration; status panels and loading states use live regions; charts include visible data-table alternatives.
- `a11y.axe.test.tsx` runs axe-core rules for landmark, name, role and region regressions. Existing behavior-focused accessibility tests remain in `a11y.phase21.test.tsx`.
- Manual checks for each release: keyboard-only navigation through sign-in, shell navigation/search, mobile drawer, project selector, dialogs/forms and AI approval flows; visible focus at 200% zoom; screen-reader announcements for validation, loading, notifications and run status; light/dark contrast; reduced motion; and RTL smoke layout when an RTL locale is enabled.

Known limitations: automated jsdom checks do not replace browser contrast and screen-reader testing, and feature-specific copy remains English when a Dutch/French key is intentionally absent. The current product locales are LTR; RTL behavior is supported by the document direction foundation but needs a complete RTL locale and visual QA before release.
