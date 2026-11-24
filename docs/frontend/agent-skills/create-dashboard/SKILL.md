---
name: create-dashboard
description: Compose responsive Fullstack Blueprint dashboard views from metrics, charts, tables, filters, and activity states.
---

# Create dashboard

## Purpose
Give users an actionable overview without hiding data quality, loading, permissions, or narrow-screen constraints.

## Required architecture
Keep server state in TanStack Query and feature hooks; compose `MetricGrid`, `StatCard`, `AdvancedDataTable`, `LazyChart`, and `QueryBoundary` with semantic tokens.

## File-placement rules
Page composition belongs in `features/<domain>` or `pages`; reusable cards/grids/charts belong in `components/dashboard` or `components/ui`. Keep chart dependencies lazy.

## Implementation workflow
Define the data contract/time range, choose bounded queries, show panel skeleton/error/empty states, provide URL filter state when shareable, add a tabular chart alternative, and test mobile layouts.

## Reference components
Use `pages/DashboardPage`, `components/dashboard`, `components/ui/LazyChart`, trend/comparison cards, and validated search-param helpers.

## Required tests
Test cancellation, filters, panel states, chart fallback/table alternative, keyboard navigation, axe, and mobile/desktop browser smoke.

## Security requirements
Scope metrics to server-authorized data, avoid sensitive values in URLs, and never infer entitlements from hidden cards.

## Accessibility requirements
Use headings/regions, descriptive chart summaries, table alternatives, visible focus, reduced motion, status labels, and responsive overflow handling.

## Acceptance criteria
Partial failures remain useful, optional charts stay lazy, important filters deep-link, and validation passes.

## Common mistakes to avoid
Avoid dashboard-wide spinners, unbounded polling, chart-only meaning, overflow, and duplicated cache ownership.
