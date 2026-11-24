# Frontend dependency matrix

Registry snapshot 2026-11-24. Locked versions come from `frontend/package-lock.json` and `npm ls --depth=0`. Candidate versions and peer ranges come from public npm `dist-tags.latest` metadata via `npm view <name> name version engines peerDependencies --json`. Phase 2 established the canonical token contract while retaining one npm lockfile and the repository's existing Tailwind/Base UI preparation. The application currently declares 27 runtime and 28 development dependencies.

## Build and test

| Capability | Locked | Registry latest observed | Compatibility and migration gate |
| --- | --- | --- | --- |
| Vite and React plugin | 8.3.8 / 6.3.0 | 8.3.8 / 6.3.0 | Upgraded and verified with Vite 8 Rolldown configuration. Vite and the plugin support Node 22.13 and 24. The proxy, React refresh, manual chunks and production output passed. [Migration guide](https://v8.vite.dev/guide/migration) |
| Vitest and V8 coverage | 5.1.1 / 5.1.1 | 5.1.1 / 5.1.1 | Upgraded as a matched pair. Vitest 5 requires Vite 6.4+ and Node 22.12+. The existing 107-test suite passed. [Vitest migration](https://vitest.dev/guide/migration/) |
| Vite PWA | 2.0.0 | 2.0.0 | Upgraded and verified with Vite 8. Workbox generated the manifest, registration script and service worker. The retained Workbox dependency has four moderate advisories with no fix available at this version. [Vite PWA guide](https://vite-pwa-org.netlify.app/guide/) |
| React and React DOM | 19.3.1 / 19.3.1 | 19.3.1 / 19.3.1 | Upgraded in lockstep with React type packages. The test and production builds passed. |
| TypeScript | 5.9.3 | 7.0.2 | Retained at 5.9.3 because the current typescript-eslint release supports TypeScript below 6.1 and TypeScript 7 would create an unsupported peer combination. The existing strict bundler configuration passed. |
| ESLint and TS lint | 10.15.0 / typescript-eslint 8.74.0 | 10.15.0 / 8.74.0 | Upgraded with `@eslint/js` 10.0.1, React hooks 7.1.1, React refresh 0.5.8 and globals 17.14.0. Flat config and lint passed with zero errors or warnings. |
| Playwright / React Testing Library | 1.65.1 / 16.3.3 | 1.65.1 / 16.3.3 | Upgraded Playwright, RTL, user-event 14.6.13 and jest-dom 8.0.0. Browser binaries remain an environment concern for CI and must be installed by the runner. |
| Package manager | npm 11.19.1 measured | npm lock v3 | Keep npm for one package with a deterministic `npm ci` path. Evaluate pnpm if workspace needs or measurable install wins justify coordinating CI, docs, Make and Docker. Retain one authoritative lockfile. |

## Runtime, design and planned capabilities

| Area | Baseline | Direction and constraints |
| --- | --- | --- |
| Styling | Tailwind CSS 4.3.5, semantic CSS variables, Day.js 1.11.20 | Tailwind owns feature-page styling and the shared token layer. Day.js remains for domain date calculations. [Tailwind compatibility](https://tailwindcss.com/docs/compatibility) |
| Accessible primitives and icons | Base UI/shadcn-compatible primitives, Lucide React, Sonner | Feature routes use shared typed primitives, semantic HTML and Lucide-compatible icons. |
| Router and server state | React Router DOM 7.18.3, TanStack Query 5.96.1 | Retain both. Consider a router change only with measured benefit and URL parity. The Query cache owns server state. |
| Forms and validation | React Hook Form 7.72.0, resolvers 5.2.2, Zod 4.6.7 | Keep RHF and Zod. Zod was upgraded to the patched 4.6.7 release and form tests passed. Resolver 5.2.2 remains compatible with the current forms. |
| API contract tooling | Hey API 0.99.0, generated OpenAPI JSON, shared credentialed fetch transport | The all-optional FastAPI profile is exported deterministically, Hey API generates SDK/types, and CI compares generated output against the committed contract. Existing transport behavior remains in `api/client.ts` while domain adapters migrate incrementally. [Hey API docs](https://heyapi.dev/openapi-ts/get-started) |
| Storybook and mocks | Storybook React/Vite 10.6.8, addon-a11y 10.6.8, MSW 3.0.7, msw-storybook-addon 3.0.3 | Development-only Storybook documentation with deterministic MSW fixtures and a generated public worker. `STORYBOOK=1` omits the application PWA plugin; production code does not import handlers. |
| Tables, dates and charts | TanStack Table, React DayPicker, Recharts and semantic metric cards | Keep presentational components and feature state separately testable; lazy-load chart-heavy routes. |
| Fonts and QR | Manrope 5.2.8 and IBM Plex Mono 5.2.7 bundled through `@fontsource`, qrcode 1.5.4 for MFA | The design contract uses a Cormorant Garamond / EB Garamond / Georgia display fallback, an Inter-first body stack with bundled Manrope fallback, and JetBrains Mono / IBM Plex Mono for code. Retain equivalent MFA QR setup with manual secret fallback. |
| Optional modules | No global client store or conversation SDK | Defer Zustand, TanStack Virtual and Dexie until concrete shared-state, measured list scale or offline requirements. Defer Tiptap and React Flow until a reusable capability has a consumer. Evaluate AI SDK UI/AI Elements, Streamdown and Shiki with an event contract. Defer assistant-ui and AG-UI pending a distinct unmet need. Evaluate React Compiler with benchmarks and Motion only for interactions that need it. i18next and command search belong to their feature phases. |

## Phase 3 implementation

| Capability | Locked | Implementation decision |
| --- | --- | --- |
| Tailwind CSS | 4.3.5 with `@tailwindcss/vite` 4.3.5 | Vite plugin integration, CSS-variable theme mapping, custom dark variant and utility layers. |
| Accessible primitives | Base UI 1.9.0 | Selected as the single primitive system for the shadcn-compatible library. Radix was not added, avoiding two competing primitive systems. |
| Class composition and variants | `clsx` 2.1.1, `tailwind-merge` 3.7.1, CVA 0.7.1 | `src/lib/utils.ts` owns `cn()` and all shared variants use typed CVA definitions. Generated imports use the configured `@/lib/utils` alias. |
| Icons and reusable capabilities | Lucide React 1.79.0, Sonner 2.0.8, cmdk 1.1.1, React DayPicker 10.0.2, date-fns 4.4.0, react-resizable-panels 4.24.1 | Added typed primitives for the required controls, overlays, navigation, tables, command palette, calendar/date pickers, notifications, scroll/resizable regions and loading/error/empty states. |

## Phase 4 implementation

Shared `ui`, `layout`, `auth`, `guards`, `notifications` and `dashboard` components use Base UI/shadcn primitives, native semantic HTML, Tailwind classes, Lucide icons and framework-independent token helpers. Feature routes use local compatibility adapters only where a retained public contract requires them; no external component-suite dependency is part of the current frontend package.

## Registry and advisory baseline

The clean Phase 1 `npm ci` succeeds with the single frontend lockfile. It still reports deprecated transitive `whatwg-encoding@3.1.1`, `source-map@0.8.0-beta.0` and `glob@11.1.0`. npm now reports six moderate Workbox/Storybook-docgen glob/minimatch advisories below. A successful Vite 8 and Storybook 10 build confirms the Rolldown platform binaries are available on this host.

| Scope | Low | Moderate | High | Critical |
| --- | ---: | ---: | ---: | ---: |
| Full lock audit after Phase 14 | 0 | 6 | 0 | 0 |
| `--omit=dev` after Phase 3 | 0 | 0 | 0 | 0 |

Phase 1 removed the previous high and critical entries from Vite, Vitest, tinypool, brace-expansion, source-map-js and Zod. Four moderate findings are inherited by `workbox-build` through `vite-plugin-pwa@2.0.0`, and two additional entries are inherited by Storybook's Vite docgen plugin; npm reports no compatible fixes. `npm run audit` uses `--audit-level=high`, so it passes while retaining visibility of these moderate findings. Downgrading the PWA or Storybook versions is not acceptable because it would reverse the verified Vite/React compatibility. One npm audit entry can aggregate several advisories or inherit severity through a dependency, so counts describe affected-package entries.

Before each installation, verify exact stable versions, engines, peers, upstream release and maintenance status, migration notes, applicable advisories, and supported Node/browser targets. npm registry compatibility is preliminary until install, build and behavior checks pass.
