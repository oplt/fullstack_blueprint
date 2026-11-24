# Frontend performance baseline

Measured on 2026-11-24 at `3271ffb`. Linux x64 / Ubuntu 26.04.1, Intel Core i9-11900K, 16 logical CPUs, Node 24.22.3, npm 11.19.1. The Vite build ran after `npm ci`, without retained TypeScript build info. Other audit jobs ran on the host, so these timings are a single reference sample.

## Production artifacts

| Measurement | Files | Raw bytes | Per-file gzip bytes, summed |
| --- | ---: | ---: | ---: |
| Complete `dist/` | 72 | 1,732,702 | 927,012 |
| `dist/assets/` | 65 | 1,344,753 | 552,908 |
| JavaScript, including the three PWA worker/registration scripts | 47 | 1,173,248 | 372,565 |
| HTML entry and module-preload JavaScript | 5 | 817,437 | 252,302 |
| HTML entry and module-preload JavaScript plus CSS | 6 | 821,675 | 253,277 |
| Main MUI vendor chunk, part of the HTML entry graph | 1 | 409,321 | 123,634 |
| CSS | 1 | 4,238 | 975 |
| WOFF2 fonts | 10 | 98,984 | 99,214 |
| WOFF fonts | 10 | 87,076 | 86,910 |
| PWA icons | 2 | 367,884 | 366,713 |

Raw sizes use file lengths. Compression uses Node zlib at gzip level 9 per file. The entry graph counts the HTML module script and preload tags, plus the CSS link where indicated. The full directory includes lazy and precache assets. Already-compressed images/fonts can grow under gzip. Browser transfer and Vite's own gzip estimate use different measurement methods.

`npm run build` took **13.10 s** wall time. Vite reported **5.14 s** and **12,302 transformed modules**. The PWA build reported **50 precache entries (1,132.48 KiB)** and generated the manifest, registration, service worker and Workbox runtime. Route chunks already split. The larger route-dependent assets include DashboardCalendar (70.47 kB), Profile (36.80 kB), AI Studio (31.67 kB) and RAG (25.35 kB), using Vite's rounded output. The MUI chunk is roughly half the entry JS by raw bytes.

## Production-preview Lighthouse

Lighthouse 13.6.0 with Chrome 158.0.8127.88, signed out at `/` on Vite preview with a local backend. One default mobile navigation run and one desktop preset run. The reported network totals include actual navigation requests and differ from compressed bundle accounting. These are local synthetic snapshots.

| Metric | Mobile | Desktop |
| --- | ---: | ---: |
| Performance | 78 | 100 |
| Accessibility | 96 | 96 |
| Best practices | 96 | 96 |
| SEO | 82 | 82 |
| Agentic browsing | 50 | 50 |
| First Contentful Paint | 1.0 s | 0.2 s |
| Largest Contentful Paint | 1.0 s | 0.2 s |
| Speed Index | 1.1 s | 0.2 s |
| Total Blocking Time | 970 ms | 0 ms |
| Cumulative Layout Shift | 0 | 0 |
| Total byte weight | 306 KiB | 306 KiB |

Lighthouse identified skipped heading levels and a missing main landmark. The console audit counted two expected auth bootstrap 401 responses plus a missing favicon. The SEO report counted a missing description and the preview server returning SPA HTML for `robots.txt`. See [the a11y baseline](TEST_BASELINE.md#accessibility-and-responsive-probes) for authenticated routes.

## PWA smoke probe

Chromium confirmed `/sw.js` controlled production preview, found zero `/api/` entries in CacheStorage after a signed-out visit, and rendered the reset-password route offline (HTTP 200 from the navigation fallback). Install prompts, update lifecycle, authenticated cache/logout and offline data mutations remain future test cases.

## Repeat measurements

1. Use the documented versions and a fresh lockfile install. Time `/usr/bin/time -f 'wall=%e s' npm run build` from `frontend/`. Capture cold and subsequent build timings separately and repeat on a quiet host for regression thresholds.
2. Sum `Buffer.length` and `gzipSync(buffer, { level: 9 }).length` by file extension. Resolve the script, module preload and CSS references in `dist/index.html` for the entry graph.
3. Serve `npm run preview` with `BACKEND_PROXY_TARGET` pointing to the disposable API. Run Lighthouse against the preview root with default mobile and `--preset=desktop` in isolated browser profiles. Compare the same routes, data and throttling before attributing changes to migrations.
4. Compare initial request waterfalls and PWA cache behavior again after tooling, design system and bundle changes. Collect authenticated and production telemetry separately when representative data exists.

## Phase 1 toolchain measurement

After the clean Phase 1 install, Vite 8.3.8 transformed **12,238 modules** and reported a local build duration of **0.660 s**. The generated output included React, forms, MUI and Query chunks, a 4.09 kB stylesheet, a 0.44 kB manifest, the registration script, a service worker and **50 precache entries (1,165.77 KiB)**. The build configuration uses Vite 8's `rolldownOptions` and a typed manual-chunk function. The new measurement is not directly comparable to the Phase 0 wall-clock run because TypeScript build information and host cache state differ.

The upgraded development server returned HTTP 200 for the SPA entry and Vite client endpoint while retaining the `/api` proxy configuration. The production preview returned HTTP 200 for `manifest.webmanifest` and `sw.js`, and the manifest retained the three existing icons and root start URL.

## Phase 2 design-system measurement

The canonical token layer adds the bundled Manrope family and semantic CSS variables while preserving route-level code splitting. The Vite 8 build transformed **12,242 modules** and completed in **0.641 s** in the local verification run. The generated stylesheet was **156.08 kB** raw (**34.90 kB** gzip) with the repository's existing Tailwind utility layer, and the PWA generated 50 precache entries. This is a toolchain comparison sample rather than a user-perceived performance budget; repeat the route and Lighthouse measurements after the Tailwind/shadcn migration.

## Phase 3 component-library measurement

After enabling the full Tailwind/Base UI component layer, Vite transformed **14,362 modules** and completed in **0.686 s**. The stylesheet was **156.90 kB** raw (**35.03 kB** gzip), and the PWA precache remained at 50 entries (**1,360.78 KiB**). The increase reflects the utility layer and imported reusable primitives; route-level JavaScript remains split and MUI remains isolated in its existing vendor chunk.

## Phase 4 shared-component measurement

After migrating shared UI/layout/auth/notification/dashboard components to typed primitives and native semantic HTML, Vite transformed **14,576 modules** and completed in **0.703 s**. The stylesheet was **167.28 kB** raw (**36.56 kB** gzip), and the PWA generated **52 precache entries (1,482.04 KiB)**. MUI remains isolated for feature pages scheduled for later phases; shared component chunks no longer require it.

## Phase 5 application-shell measurement

The responsive shell and route-derived layout variants built successfully in **0.351 s** of Vite time after TypeScript checking. Vite transformed **2,702 modules** in the current incremental build. The generated stylesheet was **169.41 kB** raw (**37.08 kB** gzip), and the PWA generated **51 precache entries (1,089.11 KiB)**. `AppLayout` is code-split into a **16.41 kB** raw chunk (**5.39 kB** gzip); project, notification and settings data remain query-backed and are not persisted beyond non-sensitive UI identifiers.

## Phase 13 performance and PWA measurement

The Phase 13 production build transformed **2,780 modules** and completed in **0.322 s** of Vite time after TypeScript checking. `npm run perf:measure` recorded **79 files**, **1,876,212 bytes** raw and **1,039,850 bytes** summed gzip. JavaScript totals were **1,049,853 bytes** raw (**336,109 gzip**); CSS was **142,876 bytes** raw (**21,861 gzip**), WOFF/WOFF2 fonts were **314,304 bytes** raw, and PWA artwork was **367,884 bytes** raw. The PWA generated **52 precache entries (1,130.29 KiB)**. The additional static Storybook MSW worker is deliberately excluded from the production precache; restricting bundled fonts to Latin and Latin-ext ranges reduced the measured output from the earlier Phase 13 sample (2,129,667 raw / 1,291,795 gzip) while preserving English, Dutch and French coverage; this is the new repeatable Phase 13 reference.

Route-level `React.lazy` splitting remains in place. Recharts is now behind `LazyChart` named dynamic imports, so chart code is not part of the shell or route entry unless a chart renderer is requested. AI conversation histories over 80 messages use the dependency-free `VirtualizedList`; artifact images use lazy loading, async decoding and responsive sizing. Query caching retains centralized mutability-aware stale times, cancellation and logout cache clearing rather than introducing a second cache.

`startWebVitals` observes FCP, LCP, CLS and INP through the browser PerformanceObserver and emits a local `blueprint:web-vital` event with rating thresholds. It performs no network telemetry or sensitive-data persistence; a product can inject an explicit sink later. React Compiler was evaluated and remains disabled because the current stack has no measured compiler-compatible configuration or regression evidence to justify enabling it globally.

The generated PWA manifest now declares standalone display, scope and an explicit start URL. Workbox cleans outdated precaches, claims clients, skips waiting, limits precached files to 3 MiB and denies navigation fallback for `/api/`; runtime caching is intentionally empty. Static `npm run pwa:check` and a Chromium production-preview probe verified manifest/service-worker/registration responses, active control, update capability, no `/api/` CacheStorage entries, and HTTP 200 offline navigation fallback for `/reset-password`.
