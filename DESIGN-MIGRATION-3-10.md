# Blueprint frontend design — Phases 3–10

Baseline: `oplt/fullstack_blueprint` commit `51d9c905ac14ff0c3374aa25319a36b517bb09ff` (profiles removed), plus the supplied centralized-UI replacement package. This is a cumulative source overlay, not a complete repository checkout. It replaces the earlier Phase 2 and centralized-UI overlays. It does **not** replace the repository README, dependency manifests, lockfiles, existing CI workflows, backend files, or unchanged feature code.

## Copy-paste installation

Work on a clean Git branch, or back up local changes. If you have changed files after the stated baseline, review the diff instead of blindly overwriting them.

```bash
cd ~/Desktop/Projects/fullstack_blueprint
git status --short
# If clean and the branch does not already exist:
git switch -c refactor/centralized-design
unzip -o ~/Downloads/blueprint-phases-3-10.zip -d .
git status --short
git diff --stat
grep -nF '.ui-button {' frontend/src/index.css
grep -nF '.ui-card {' frontend/src/index.css
```

The ZIP has repository-relative paths. Copy every supplied file together: the single cumulative `frontend/src/index.css` intentionally contains the formats used by all phases. Do not apply an older Phase 2 CSS file afterwards. Do not delete `frontend/src` or `frontend/src/components/ui` before copying.

## Phase-by-phase replacement map

| Phase | Files and changes | Remaining validation |
|---|---|---|
| 3 — Card composition | `card.tsx`, `SectionCard.tsx`, `StatCard.tsx`, `ComparisonCard.tsx`, `StatCardSkeletonGrid.tsx`, `MetricGrid.tsx`, `card.test.tsx`, RAG metric/observability/account-health/task cards. One Card density/surface implementation; section/article semantics and flat/subtle/outlined variants. | Check existing consumers, card sizing, custom overrides and overflow. |
| 4 — Overlays and controls | All existing shared UI modules included, including `button.tsx`, `dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx`, `popover.tsx`, `dropdown-menu.tsx`, `tooltip.tsx`, `combobox.tsx`, input/textarea/select/field/label/checkbox/switch. CSS-owned visual recipes, common portal stacking rank, constrained dialog size, close target and focus styles. | Browser tests for nested menus/dialogs, focus return, escape, mobile drawer, control states. Common portal rank relies on Base UI portal ordering. |
| 5 — Recharts | `charts.tsx`, `ComparisonCard.tsx`, `TrendIndicator.tsx`, `LazyChart.tsx`, `charts.test.tsx`; five colors, semantic color allowlist, CSS axes/grid/tooltip, accessible chart group/data table, keyboard accessibility, no-data state, nonessential animation disabled. | Verify chart keyboard navigation, colors and sizing using locked Recharts. Arbitrary legacy colors fall back to the categorical palette; migrate intentional series colors to tokens. Numerical library geometry (e.g. bar radius and pie angles) remains explicit. |
| 6 — Motion | `index.css`, existing shared UI components; CSS durations, keyframes, transitions, state selectors, reduced-motion rules. | Remaining feature-specific animation utilities reported by checker; use supported motion formats only. |
| 7 — Responsive layout | `components/layout/AppLayout.tsx`, `WorkspaceSidebar.tsx`, `layoutVariants.ts`, `hooks/use-mobile.ts`, `components/auth/AuthShell.tsx`, `AuthMarketingPanel.tsx`, all shared layout primitives, `PageShell.test.tsx`, `AppLayout.test.tsx`. CSS navigation widths, gutters, header, viewport/container breakpoints; mobile drawer unmounts when crossing the desktop breakpoint. | Verify live app navigation and layout, sidebar collapse, 320px reflow, 200% zoom and translations. |
| 8 — Features | Complete replacement files for `RagMetricTile`, `HealthStatusCard`, `ObservabilityShortcutCard`, `ProjectTaskCards`, `AccountHealthCard`, `GenerativeUiRenderer`. Shared Card/Badge/Button/Lucide, no independent static inline styling in these files. Correct task option values and restore task metadata labels. | **Partial:** the rest of the feature tree requires local migration/review. Do not claim repo-wide cleanup until the report is resolved and all tests pass. |
| 9 — Enforcement | `frontend/scripts/check-design-system.mjs`, `test-design-checker.mjs`, `frontend/eslint.config.js`, `.github/workflows/design-validation.yml`. Preserve existing lint rules and CI workflows; check banned packages/imports, authored stylesheets, raw colors, palette utilities, static style props, legacy animation names, known format references and token consistency, native-control and SVG exceptions, documented palette and navigation breakpoint. | Run on the full checkout. Existing violations may now fail intentionally; dynamic expressions still require manual review. No automatic exemptions or weakening of existing tests. |
| 10 — Visual validation | `DesignValidation.stories.tsx`, `playwright.design.config.ts`, `e2e-design/design.pw.ts`, `design-validation.yml`; responsive and axe checks at eight widths in light/dark themes, card density and control height, data-table fallback, keyboard/nested overlay hit testing, screenshots. | **Not executed here:** run Storybook, Chromium and the existing app E2E suite. Review screenshots; create and commit approved baselines before requiring visual comparisons. Full application pages, theme persistence, RTL/i18n and WCAG manual review still need coverage. |

## Phase 8: safely preview additional feature migrations

```bash
cd ~/Desktop/Projects/fullstack_blueprint
# npm ci in frontend if dependencies are not installed or have changed
node centralize-remaining-ui.mjs --include-features --output centralized-ui-preview-3-10
cat centralized-ui-preview-3-10/migration-report.json
```

This migration script is now preview-only. The `--write` option is rejected intentionally; bulk CSS extraction can change cascade/override behavior and cannot guarantee feature-level correctness. A new output directory is required to avoid stale generated files. Review proposed `ui-auto-*` formats: combine identical recipes with canonical components instead of adding duplicates, keep valid dynamic geometry and third-party classes, and manually resolve reported dynamic/template/inline styles. Copy the approved source files and their matching CSS rules together. Do not commit the preview directory. Run all checks below. Do not overwrite already reviewed files from an older preview.

## Local checks

```bash
cd frontend
npm ci
npm run design:check
node scripts/test-design-checker.mjs
npm run lint
npm run typecheck
npm test
npm run build
npm run pwa:check
npm run perf:check
npm run storybook:build
npx playwright install chromium
npx playwright test --config playwright.design.config.ts
```

Run the existing app E2E separately with the disposable/local API and database configured as required by the existing repository workflow:

```bash
npm run test:e2e -- --project=chromium
```

Do not use a production database or production credentials for mutating E2E tests.

## Establish visual baselines (after browser tests pass)

Review screenshots attached to the Playwright results for light/dark and all target widths. Use a reproducible Linux/Chromium environment with the same installed fonts for baseline generation and CI:

```bash
cd frontend
VISUAL_COMPARE=1 npx playwright test --config playwright.design.config.ts --update-snapshots
# Review every PNG before committing the baseline folder.
VISUAL_COMPARE=1 npx playwright test --config playwright.design.config.ts
```

The new CI workflow always requires browser assertions and axe checks. It enables pixel comparisons when the baseline directory `frontend/e2e-design/design.pw.ts-snapshots/` exists. No baselines are fabricated in this package. Keep the existing frontend validation workflow, including full locked build, contract, unit, performance, PWA and E2E checks. Do not approve snapshots merely to silence a failure.

## Results and limits of this delivery

- The complete supplied `index.css` compiled using the available Tailwind 4.1.10 compiler with font imports omitted only in the smoke-test harness. The actual locked repository version is different; use `npm ci` and run the real build.
- The supplied TypeScript files were syntax-parsed. This is not the repository's semantic `tsc -b` check.
- The strengthened checker passed on an isolated copy of the supplied sources (not the complete repository) and matched 50 documented light/dark palette roles. A valid fixture and seven rejection fixtures passed. The real lockfile was not installed in this environment; run the checker against your actual package-lock.json.
- No additional dependency, CSS file, package/lockfile modification or repository push is required by the supplied changes. Third-party FullCalendar skeleton CSS and numeric/dynamic library geometry remain intentional exceptions.
- Full npm install/build, ESLint, full Vitest, Storybook, Playwright, accessibility and visual regression checks are not claimed as passed. Phase 8 is not complete repository-wide and Phase 10 is not complete until real browser checks, manual accessibility review and baseline approval are performed. Resolve any failing existing tests without deleting meaningful assertions.
