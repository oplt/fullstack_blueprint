# Reusable business UI

Phase 9 adds domain-neutral building blocks under `frontend/src/components/ui`.

## Data and dashboards

- `AdvancedDataTable` uses TanStack Table 8 for sorting, global filtering, controlled or client pagination, column visibility/resizing, row selection, expandable rows, custom cells, loading/error/empty states, responsive overflow and CSV export hooks. `DataTable` remains as the compatibility wrapper used by migrated screens and re-exports the advanced implementation.
- `charts.tsx` provides line, area, bar and donut cards, accessible descriptions, trend/comparison cards and a visible data-table alternative. Recharts is imported only by the chart module so route bundles that do not use charts do not load it.
- `DashboardFilters` is a small composition primitive for URL- or parent-owned filters. It does not copy server state into a store.

Large-list virtualization is intentionally not enabled. The current screens do not have a measured viewport bottleneck; TanStack Virtual can be added behind `AdvancedDataTable` once a profiling result justifies the optional dependency.

## Forms and files

- `FormTextField`, `FormTextarea` and `formErrors.ts` standardize React Hook Form field state, accessible descriptions, field-level errors and FastAPI `ApiError.fieldErrors` mapping. Zod schemas and `zodResolver` remain owned by each domain form.
- `MultiStepForm`, `OnboardingSteps`, `useUnsavedChanges` and `FileUploader`/`FilePreview` cover multi-step flows, unload protection, file-size/type boundaries and previews without inventing a backend upload protocol.

## Optional reference modules

`MarkdownRenderer` (safe text-only subset), `CodeViewer`, `JsonInspector`, `ActivityTimeline`, `AuditLogViewer`, `UserSelector`, `TeamSelector` and `Notification`/dashboard composition helpers are intentionally backend-agnostic. Existing command palette, notification preference and context inspector components remain available.

Rich text editing (Tiptap) and visual workflow editing (React Flow) remain documented extension points rather than dependencies: no current route has a real backend contract that needs them, so they are not added to the core bundle. Any future integration must be lazy-loaded and bind actions to server-authorized mutations.

## Ownership and testing

Components accept data, callbacks and render functions; they do not own domain caches. TanStack Query remains the server-state owner, React Hook Form owns form state, and URL filters remain router state. Focused tests cover table search/sort/selection/loading/error behavior, file-size rejection and dashboard trend semantics.

