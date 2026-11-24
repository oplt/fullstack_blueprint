# Compatibility-layer audit (historical)

> The compatibility layer described here has been removed. This file remains the Phase 1 evidence record; current code uses native shadcn/Base UI primitives, semantic HTML and Tailwind CSS.

Audit date: 2026-11-24

## Inventory

The former compatibility module was `frontend/src/components/ui/muiCompat.tsx`. It was a 56-line collection of untyped wrappers rather than a primitive library. It has been deleted; the export inventory below is retained as audit evidence.

`styleCompat.ts` supplies `StyleCompat` and `inlineStyle()`. It translates a small subset of `sx` aliases (`m`, `p`, `px`, `py`, `bgcolor`, and similar keys), numeric spacing, a few palette strings, and only the `xs` responsive value. Unknown keys, callbacks, breakpoint values, pseudo-selectors, nested selectors, and most MUI system behavior are silently dropped or emitted as invalid inline CSS.

## Consumers

At audit time there were 59 production files and 8 test files importing `muiCompat`. Production consumers covered application providers/router/error handling, authentication, dashboard, profile/MFA, projects/tasks, calendar, notifications, administration, platform settings, AI Studio, agents, RAG, memory, observability, and settings administration. Test consumers mostly wrapped components in the no-op `ThemeProvider` and called `createTheme()`.

## Risks found

- `Props` is an index-signature with `any` event types, so unsupported props compile and are forwarded to DOM nodes.
- `clean()` removes `sx`, `component`, icon/adornment props, `error`, `variant`, `size`, and `color` regardless of whether the target element supports them; several wrappers therefore silently ignore behavior.
- `Stack` supports only a partial direction/spacing translation and writes layout values into inline styles. Responsive direction objects are not implemented.
- `Typography` maps only a few variants and defaults to `span`, causing semantic heading/paragraph regressions.
- `Button` renders an anchor or button without enforcing `type="button"`, and MUI variants/colors are discarded.
- `TextField` has no stable label/description IDs, does not implement select or adornment contracts faithfully, and forwards arbitrary props to `input`, `textarea`, or `select`.
- `Drawer`, `Dialog`, `Tooltip`, `Tabs`, `Badge`, and `TablePagination` are behaviorally incomplete: focus management, keyboard semantics, announcements, portal/layering, and localization are absent or partial.
- `useMediaQuery` ignores its query argument and hard-codes one viewport query; `useTheme` returns a fabricated light palette.
- `alpha`, `createTheme`, and `styleCompat` preserve a theme and `sx` vocabulary after the external dependency was removed, making new code likely to reintroduce the retired architecture.
- Theme tests and `theme.ts` validate fabricated compatibility objects rather than the CSS-variable/token contract used by the application.

## Migration strategy

Migrate shared shell and test-only theme scaffolding first, then feature files in domain batches. Use existing `components/ui` primitives (`button`, `input`, `textarea`, `select`, `dialog`, `drawer`, `tooltip`, `badge`, `avatar`, `skeleton`, `table`, `tabs`, `field`) and semantic HTML. Replace `sx` with Tailwind classes or explicit, typed `style` values only where values are genuinely data-dependent. After the final batch, remove `muiCompat.tsx`, `styleCompat.ts`, `theme.ts`, and compatibility-only tests and add a guard preventing new `muiCompat` imports.
