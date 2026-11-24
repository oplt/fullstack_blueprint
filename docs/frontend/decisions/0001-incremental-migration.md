# 0001 Incremental frontend migration

**Status** Accepted for implementation on 2026-11-24.

Retain the existing single npm package, React Router, TanStack Query, React Hook Form and Zod. Establish semantic CSS variables before introducing the new primitives and keep the legacy MUI theme active during coexistence. Migrate shared component behavior, then migrate feature consumers. Remove MUI and Emotion after repository-wide scans and browser checks support removal.

The Phase 3 primitive spike selected Base UI, the current shadcn default, after verifying typed controls, keyboard-oriented overlays, portals and field coverage. Radix is not installed, avoiding two competing primitive systems. [shadcn decision](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default)

Keep FastAPI authority for availability, entitlements and resource policies. Generated TypeScript contracts run through the same credentialed transport. The new AI workspace uses explicit backend contracts and isolated development fixtures for unavailable events.

This order preserves observable behavior while updating one integration boundary at a time. The temporary dual styling setup needs reset and layer tests. A router, package-manager or state-store migration can be reconsidered with concrete requirements or measured benefit.
