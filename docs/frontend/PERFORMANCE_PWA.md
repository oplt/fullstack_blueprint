# Phase 13 performance and PWA controls

## Performance controls

- Route modules continue to use `React.lazy` and route-level Suspense boundaries.
- Recharts is deferred behind `components/ui/LazyChart.tsx`; the generative UI renderer does not eagerly load chart implementations.
- `VirtualizedList` windows long, mostly uniform lists and is used for AI histories over 80 messages. It bounds DOM work while preserving semantic list/listitem roles.
- Artifact images use `loading="lazy"`, asynchronous decoding and responsive `sizes` metadata.
- TanStack Query remains the sole server-state cache. Existing stale-time, cancellation, deduplication and logout cleanup policies remain authoritative.
- `startWebVitals` monitors FCP, LCP, CLS and INP through `PerformanceObserver`. Metrics are sampled and emitted as an in-page event only; no user or API data is sent anywhere by default.
- `npm run perf:measure` reports raw and gzip output by extension and largest assets for repeatable bundle comparisons.

React Compiler remains disabled. The repository has no isolated compiler build or measured benefit/regression evidence, and enabling it globally would add risk without a Phase 13 performance signal.

## PWA controls

The Vite PWA configuration retains `generateSW` and auto-update while enabling outdated-cache cleanup, `clientsClaim`, `skipWaiting`, a navigation fallback, a 3 MiB precache limit and an `/api/` navigation denylist. `runtimeCaching` is explicitly empty: authenticated API responses, cookies and CSRF data are not cached by the service worker. Query state is cleared at logout by the existing auth boundary.

`npm run pwa:check` validates the built manifest, service worker, registration script, installability metadata and absence of API runtime cache rules. The Phase 13 Chromium probe additionally verified service-worker control/update registration, manifest availability, zero API CacheStorage entries and offline SPA fallback. Dexie was not added because the product has no defined offline mutation/synchronization policy.

## Release checks

Run `npm run build`, `npm run perf:measure`, `npm run pwa:check`, and the production-preview browser probe before release. Compare output against [PERFORMANCE_BASELINE.md](PERFORMANCE_BASELINE.md). Investigate regressions in entry JavaScript, precache size, FCP/LCP/CLS/INP or authenticated cache behavior before changing thresholds.
