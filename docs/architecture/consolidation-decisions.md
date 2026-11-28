# Consolidation decisions (sections 4, 8, 9, 10)

This log records the merge decisions taken while consolidating backend identity and
frontend feature/shared-UI/shared-library fragmentation. It follows the "mandatory merge
decision rules" from the architecture simplification brief: inspect consumers, merge only
cohesive functionality, and reject any merge that weakens a security, provider, caching,
lazy-loading or fast-refresh boundary.

## Section 4 — Backend identity

All five consolidation targets were applied. The module has no independent provider,
transaction or security boundaries between the user and profile resources (both are owned
by the same tenant/identity boundary and the same request-scoped session).

| Merged | Destination |
| --- | --- |
| `models.py`, `user_models.py`, `profile_models.py` | `models.py` (`User`, `RefreshSession`, `UserProfile`) |
| `repository.py`, `user_repository.py`, `profile_repository.py` | `repository.py` (`IdentityRepository`, `UsersRepository`, `ProfileRepository`) |
| `schemas.py`, `user_schemas.py`, `profile_schemas.py`, `profile_serializers.py` | `schemas.py` (auth + user + profile schemas, plus `profile_to_response`) |
| `users.py`, `profile.py` | `service.py` (`UsersService`, `ProfileService`) |
| `user_routes.py`, `profile_routes.py` | `router.py` (exports `users_router` and `profile_router`) |

`auth.py`, `auth_routes.py`, `dependencies.py` and `organizations/` are intentionally kept
separate: authentication/session revocation and multi-tenancy are independent security
boundaries. Route prefixes (`/users`, `/profile`) and response schemas are unchanged, so the
OpenAPI contract and API compatibility are preserved.

## Section 8 — Frontend page/component pairs

Forwarding-only wrappers were inlined into their page module and deleted.

| Merged | Result |
| --- | --- |
| `AiStudioPage`, `AiStudioView` | `AiStudioPage.tsx` |
| `ProfilePage`, `ProfileView` | `ProfilePage.tsx` |
| `PlatformPage`, `PlatformView` | `IntegrationsPage.tsx` (integration-specific) |
| `ObservabilityPage`, `ObservabilityView` | `ObservabilityPage.tsx` |
| `ProjectDetailPage`, `ProjectDetailView` | `ProjectDetailPage.tsx` |
| `AdminPlatformPage`, `AdminPlatformContent` | `AdminPlatformPage.tsx` (content inlined; `key` reset preserved) |
| `AdminSettingsPage`, `AdminSettingsContent` | `AdminSettingsPage.tsx` (content inlined; `key` reset preserved) |

### Rejected

- **`DashboardCalendarSlot` + `DashboardCalendar` → `DashboardCalendar.tsx`** — rejected.
  `DashboardCalendarSlot` is not a forwarding wrapper: it owns a `lazy()` boundary plus a
  `Suspense` fallback that defers the FullCalendar runtime (`calendar-runtime` chunk) off the
  dashboard route. Merging it into the calendar component would eliminate the lazy-loading
  boundary and pull the heavy runtime into the dashboard chunk.

## Section 9 — Frontend shared UI

Composite components were consolidated and moved out of `components/ui/` into `components/`,
reserving `components/ui/` for canonical primitives (button, card, tabs, badge, etc.).

| Merged | Result |
| --- | --- |
| `PageShell`, `PageHeader`, `PageTabs` | `components/PageLayout.tsx` |
| `StatCard`, `StatCardSkeletonGrid`, `MetricGrid` | `components/Metrics.tsx` |
| `SectionCard`, `ResponsiveCardGrid` | `components/Section.tsx` |
| `EmptyState`, `error-state`, `loading-state` | `components/Feedback.tsx` |
| `RunStatusBadge`, `RunStatusPanel` | `components/RunStatus.tsx` (shared domain-independent run status contract) |
| `LanguageSelector` | moved to `i18n/LanguageSelector.tsx` |
| `event-calendar*` components | moved to `features/calendar/` |

### Rejected / partial

- **`KeyValueList` + `keyValueItems` → `KeyValueList.tsx`** — partial. The `KeyValueList`
  component moved to `components/KeyValueList.tsx`, but the `keyValueItemsFromRecord` helper
  remains in `components/keyValueItems.ts`. Merging a non-component export into a `.tsx`
  component file breaks the enforced `react-refresh/only-export-components` rule (Fast Refresh),
  so the helper is retained in a `.ts` module alongside it.
- **`JsonBlock` + `jsonDisplay` → `JsonBlock.tsx`** — partial, same reason. `JsonBlock`
  moved to `components/JsonBlock.tsx`; `stringifyPretty`, `formatDisplayValue`,
  `recordToKeyValueItems` and `copyTextToClipboard` remain in `components/jsonDisplay.ts`
  because they are non-component helpers and are also consumed by
  `features/ai/EvaluationResults.tsx` and `features/agents/AgentOutputDetails.tsx`.
- **`runStatusModel` → `RunStatus.tsx`** — partial, same reason. `RunStatusBadge` and
  `RunStatusPanel` merged into `components/RunStatus.tsx`; the pure status model remains in
  `components/runStatusModel.ts` (non-component exports, consumed across AI, agents and RAG).

## Section 10 — Frontend shared libraries

| Current file(s) | Destination |
| --- | --- |
| `configurationContext.ts`, `configuration.ts`, `configurationTypes.ts`, `useConfiguration.ts` | `app/configuration.ts` |
| `ConfigurationProvider.tsx` | `app/ConfigurationProvider.tsx` |
| `platformApi.ts` | `features/platform/api.ts` |
| `usePlatformMetadata.ts` | `features/platform/hooks.ts` |
| `useProjectsQuery.ts` | `features/projects/hooks.ts` |
| `useSettingsTabs.ts` | `app/useSettingsTabs.ts` |
| `useTabQueryParam.ts` | `app/searchParams.ts` (overlaps with the existing URL-param parsers) |
| `routes.ts` | `app/routes.ts` |

`queryClient.ts` and the generated OpenAPI contracts in `lib/generated/` remain in `lib/`.
The `configuration.*` consolidation moved all type-only imports of `CapabilityId` etc. to
`app/configuration.ts`; the only runtime import (`CAPABILITY_IDS`, `CAPABILITY_MANIFESTS` from
`lib/capabilities.ts`) is type-safe and cycle-free.
