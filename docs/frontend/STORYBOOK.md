# Storybook component documentation

Phase 14 adds Storybook 10.6 with the React/Vite framework and an MSW 3 fixture layer. Run from `frontend/`:

```sh
npm run storybook          # interactive development server on port 6006
npm run storybook:build    # deterministic static build
```

The `.storybook/preview.tsx` decorator supplies the design tokens, i18next resources, a memory router, theme/language toolbar globals and the MSW loader. Storybook is intentionally separated from production entrypoints; `STORYBOOK=1` disables the application PWA plugin during the Storybook build so the static documentation bundle does not generate a second service worker.

## Coverage

Stories cover design-token presets, typography, buttons and controls, dialogs, forms/uploads, navigation desktop/mobile layouts, data-table default/empty/loading/error states, charts, loading/empty/error feedback, AI conversations/streaming/tool/approval/artifact states, and generative UI overview/report/invalid/action states. Play functions exercise keyboard focus, retry, dialog open/close, approval, invalid-payload fallback and form interaction.

`src/mocks/handlers.ts` contains deterministic Storybook-only responses for metadata, identity and projects. The MSW worker is served from `public/mockServiceWorker.js`; handlers are bypassed for unmocked requests and are never imported by production `main.tsx`.

The static build has been smoke-tested with Chromium against Button and Generative UI stories. The a11y addon remains enabled for interactive Storybook review; automated axe smoke coverage also runs in Vitest. Visual regression baselines are intentionally not committed yet because they require a stable browser/font rendering matrix; the stories provide deterministic inputs for a later baseline job.
