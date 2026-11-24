---
name: create-data-table
description: Build accessible sortable, filterable, paginated, responsive, and optionally exportable data tables with the repository table primitives.
---

# Create data table

## Purpose
Present bounded records while preserving URL/query state and useful loading, error, and empty experiences.

## Required architecture
Use `AdvancedDataTable` and TanStack Table row models; keep fetching and query state in the feature hook, not the table primitive. Use centralized query keys and shared transport.

## File-placement rules
Put columns and adapters in `features/<domain>`, reusable behavior in `components/ui`, and CSV mapping in a feature adapter. Never edit generated API files.

## Implementation workflow
Define a typed row model, bounded filter/sort/page parameters, stable column IDs, server pagination for unbounded data, responsive presentation, and an explicit export policy.

## Reference components
See `components/ui/AdvancedDataTable`, `DataTable`, `TruncatedCell`, `QueryBoundary`, and the RAG/project table consumers.

## Required tests
Cover sort/filter/page transitions, empty/error/loading, selection/expansion, CSV escaping, responsive overflow, keyboard traversal, and axe semantics.

## Security requirements
Treat filters and IDs as untrusted; enforce access and pagination server-side. Export only records the user can retrieve, never sensitive data in URLs/localStorage.

## Accessibility requirements
Use a real labelled table, expose sort and selection state, keep controls keyboard reachable, provide non-color status, and offer mobile scroll/alternative.

## Acceptance criteria
Rows are stable and bounded, cancellation works, exports match authorization, mobile widths work, and tests/types/lint pass.

## Common mistakes to avoid
Do not fetch inside cells, use array indexes as IDs, silently client-page unbounded data, or hide required columns without an alternative.
