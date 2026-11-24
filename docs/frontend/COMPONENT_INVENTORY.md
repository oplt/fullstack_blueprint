# Component inventory

Scope includes tracked TypeScript frontend source, tests, build config and the lockfile. This document is a historical migration snapshot of the former component-suite dependency and is retained for audit traceability; its dependency, theme, rendering and build rows are not the current runtime state. For current ownership and dependencies, use [DEPENDENCY_MATRIX](DEPENDENCY_MATRIX.md) and [ARCHITECTURE](ARCHITECTURE.md). Shared consumers are static relative imports with the lazy shell edge called out separately. Phase 3 added the typed, domain-independent Base UI/shadcn primitives under `src/components/ui`; later phases completed the shared and feature migration.

## Dependency footprint

| Package | Locked | Usage |
| --- | --- | --- |
| `@mui/material` | 7.3.9 | Visual components, styling/theme API, `SxProps`, theme and responsive hooks. |
| `@mui/icons-material` | 7.3.9 | Barrel and per-icon imports. Replace by meaning, with labels on interactive controls. |
| `@mui/x-date-pickers` | 8.27.2 | Day.js adapter, localization provider, date-calendar and pickers/day slots. |
| `@emotion/react`, `@emotion/styled` | 11.14.0 / 11.14.1 | Direct dependencies with no direct source import. MUI styled engine uses them. Vite references both in the MUI chunk. |
| Tailwind/shadcn support | Tailwind CSS v4, `@tailwindcss/vite`, Base UI, `class-variance-authority`, `clsx`, `tailwind-merge`, Lucide React, React DayPicker, Sonner, cmdk and resizable panels | Shared primitive library and utility styling; Base UI is the single new accessible primitive system. |
| MUI support packages | Lockfile | `@mui/system`, `@mui/styled-engine`, `@mui/private-theming`, `@mui/utils`, `@mui/types`, `@mui/x-internals`, `@mui/x-telemetry` and `@mui/core-downloads-tracker`. |
| Emotion support packages | Lockfile | `@emotion/{babel-plugin,cache,hash,is-prop-valid,memoize,serialize,sheet,unitless,use-insertion-effect-with-fallbacks,utils,weak-memoize}`. |

## Theme and styling inventory

| Source | Current contract |
| --- | --- |
| `app/designTokens.ts` and `app/theme.ts` | Canonical semantic palette with four presets, Manrope/IBM Plex Mono typography, CSS custom properties, configurable radius/density, motion, elevation and responsive breakpoint tokens. The MUI compatibility theme consumes the same token object. |
| `MuiCssBaseline` | Mode color-scheme, canonical `--color-*`/`--font-*`/`--radius-*` properties, box sizing, selection, anchor focus/hover, global scroll/motion and body styles. |
| `MuiAppBar`, `MuiPaper`, `MuiCard`, `MuiDrawer` | Surface colors, borders, radii, no default elevation for paper/card and neutralized chrome. |
| `MuiButton`, `MuiIconButton`, `MuiOutlinedInput`, `MuiInputLabel`, `MuiLink` | Sizes, typography, interactions, focus rings, hover and disabled colors, placeholder and input padding. |
| `MuiAlert`, `MuiDialog`, `MuiChip`, `MuiTooltip`, `MuiAvatar` | Severity surfaces, dialog border/shadow, status chip states, tooltip timing/touch/description behavior and avatar weight. |
| `MuiTableCell`, `MuiListItemButton`, `MuiTabs`, `MuiTab`, `MuiAccordionSummary`, `MuiDivider`, `MuiSkeleton` | Table headers/dividers, navigation selection/focus, tab sizes and indicator, accordion focus, reduced-motion skeleton behavior. |
| `src/index.css` and `main.tsx` | Tailwind v4 theme/utilities via the Vite plugin, canonical CSS variable fallbacks, Manrope 400/500/600/700 and IBM Plex Mono stylesheet imports, semantic body/code fonts, links/forms/images, scrollbars and reduced-motion behavior. Tailwind preflight is deliberately disabled while MUI remains active. |
| `components.json` and `src/components/ui/*` | shadcn-compatible aliases/configuration plus typed Base UI primitives for fields, overlays, navigation, feedback, date selection, command, scrolling and layout. Components use `cn()` and CVA where variants are needed and remain independent of feature/domain modules. |
| `components/ui/{layoutTokens,dataTableTokens,responsiveQa,themeSurfaces}.ts` | Semantic layout sizes, density/sticky levels, responsive grid/scroll and framework-independent light/dark surface helpers. |
| Rendering patterns | `sx` objects and theme callbacks, semantic palette strings, responsive keys, MUI spacing and responsive props, `useTheme`/`useMediaQuery`, slot/slotProps, `alpha()`, and feature-local CSS/inline values. Direct `styled()`, `makeStyles` and CSS-in-JS keyframe usages were absent in tracked application code. |
| Local MUI selectors | `AppLayout` targets drawer paper, `FormGrid` targets form control/text field children, `PageTabs` customizes scroller/tab/indicator, and calendar customizes DayCalendar and selected/today slots. Tests assert generated MUI class/override details in agent and theme tests. |
| Build config | `vite.config.ts` manually groups MUI material, icons and Emotion. MUI X also enters through the global date provider and is visible in the entry graph. |

## Replacement classification

| Direct visual substitutions | Preserve |
| --- | --- |
| Box, Stack, Container, Toolbar, Typography, Link | Semantic HTML, responsive flex/grid, headings, wrapping, visited and focus states. |
| Button, IconButton, ButtonGroup, ToggleButton, ToggleButtonGroup | Button variants and grouped pressed state, links where navigational, accessible names, disabled and pending behavior. |
| TextField (including select mode), InputAdornment, FormControlLabel, Checkbox, Switch, MenuItem | Field composition, label/error IDs, RHF refs, input adornments, boolean states and keyboard options. |
| Avatar, Badge, Chip, Divider, Paper, List, ListItemButton, ListItemIcon, ListItemText | Shared styling, semantic list structure, click targets and explicit status text. |
| Dialog and its subcomponents, Accordion family, Collapse, Drawer, Menu, Popover, Tooltip, Tabs/Tab | Accessible primitives with focus trap/restore, dismissal, keyboard semantics and portal layering. Page-level compositions still need behavior checks. |
| Alert, CircularProgress, Skeleton, LinearProgress, Snackbar | Inline feedback, motion preference, loading announcements, and Sonner through the existing toast API. |
| Table family, TableSortLabel, TablePagination | Semantic table primitives with custom table behavior below. |
| MUI icons and theme utilities | Shared components now use Lucide icon mapping, CSS variables/utilities and native responsive conditions. Remaining MUI imports are feature-page migration work in later phases. |

| Custom composition | Behavior to preserve |
| --- | --- |
| `DataTable`, `TruncatedCell` | Existing generic column API, controlled/local filtering and sort, pagination, selection/expansion, sticky chrome, hidden columns, density, truncation, scroll, loading/empty states. Use TanStack Table for row models, accessible native table for rendering. |
| `PageHeader`, `PageShell`, `PageTabs`, `SectionCard`, `MetricGrid`, `StatCard`, `StatCardSkeletonGrid` | Heading/landmark hierarchy, overflow actions, readable widths, URL tab state, cards and supporting metrics. Compose direct primitives under stable wrapper APIs during migration. |
| `WorkspaceSplit`, `ResponsiveCardGrid`, `ScrollRegion`, `FormGrid` | Breakpoint-aware layout, column ratios, accessible scroll, field width and available side context on smaller screens. |
| `QueryBoundary`, `QueryErrorAlert`, `EmptyState`, `SkipToContentLink` | Loading announcements and retry/empty slots, focus target and error semantics. |
| `AdvancedSettings`, `HelpTooltip`, `HelpFieldLabel`, `DisabledWithReason` | Details persistence on toggle, help/description IDs, touch and keyboard discoverability, accessible disabled explanations. |
| `ContextInspector`, `ContextInspectorHeader`, `JsonBlock`, `KeyValueList`, `RunStatusPanel`, `RunStatusChip` | Structured inspection, bounded previews, copy, status labels independent of color, progress and slots. Preserve adjacent pure model helpers. |
| `AppLayout`, `SettingsTabs`, `NotificationNavBadge`, `ProtectedRoute` | Responsive drawer, navigation and badge, theme/logout/profile actions, guards, query URL navigation and focus. |
| `AuthShell`, `AuthMarketingPanel`, `NotificationListItem`, `DashboardCalendar` | Form/card layout, keyboard access and notification read actions, conformance of dashboard view and calendar permissions. |
| Calendar feature and provider | React DayPicker can implement date selection. Day/week/year views, item drawer, planner/task distinction, range serialization and timestamp/locale behavior require feature code. |
| `SnackbarProvider`, route error/loader and feature gates | Preserve public toast hook, error recovery, auth/feature pending, disabled and retry behavior across provider swaps. |

## Shared direct consumers

`components/layout/AppLayout` is imported lazily by `app/router.tsx`. The following list includes internal shared dependencies and direct test consumers.

| Shared source | Direct static consumers |
| --- | --- |
| `components/auth/AuthMarketingPanel` | `pages/AuthHomePage`, `pages/ResetPasswordPage`, `pages/VerifyEmailPage` |
| `components/auth/AuthShell` | `pages/AuthHomePage`, `pages/ResetPasswordPage`, `pages/VerifyEmailPage` |
| `components/dashboard/DashboardCalendar` | `pages/CalendarPage`, `pages/DashboardPage` |
| `components/guards/ProtectedRoute` | `app/router`, `components/guards/ProtectedRoute.test` |
| `components/layout/AppLayout` | `app/router` (lazy) |
| `components/layout/NotificationNavBadge` | `components/layout/AppLayout` |
| `components/layout/SettingsTabs` | `features/agent/AgentView`, `features/ai/views/AiStudioView`, `features/memory/MemoryView`, `features/observability/views/ObservabilityView`, `features/platform-admin/components/AdminPlatformContent`, `features/platform-admin/views/AdminPlatformView`, `features/platform/views/PlatformView`, `features/profile/views/ProfileView`, `features/rag/RagView`, `features/settings-admin/components/AdminSettingsContent`, `features/settings-admin/views/AdminSettingsView`, `pages/AdminUsersPage` |
| `components/notifications/NotificationListItem` | `pages/DashboardPage`, `pages/NotificationsPage` |
| `components/ui/AdvancedSettings` | `components/ui/a11y.phase21.test`, `components/ui/layoutPrimitives.test`, `features/agent/AgentRunDetail`, `features/agent/AgentView`, `features/ai/components/ReviewsEvaluationsPanel`, `features/ai/components/RunPlaygroundPanel` |
| `components/ui/ContextInspector` | No external static consumer. `ContextInspectorHeader` is also exported from this file. |
| `components/ui/DataTable` | `components/ui/DataTable.test`, `features/rag/RagView` |
| `components/ui/DisabledWithReason` | `components/ui/DisabledWithReason.test`, `features/agent/AgentView` |
| `components/ui/EmptyState` | `components/ui/DataTable`, `features/agent/AgentView`, `features/ai/components/PromptLibraryPanel`, `features/ai/components/RetrievalDocumentsPanel`, `features/ai/components/ReviewsEvaluationsPanel`, `features/ai/components/RunPlaygroundPanel`, `features/calendar/components/DayItems`, `features/memory/MemoryView`, `features/observability/components/ObservabilityHealthGrid`, `features/observability/components/ObservabilityShortcuts`, `features/platform/components/PlatformSections`, `features/profile/components/ProfileSections`, `features/projects/components/ProjectFlowSection`, `features/rag/RagView`, `features/settings-admin/components/DatabaseSettingsSections`, `pages/AdminUsersPage`, `pages/DashboardPage`, `pages/NotificationsPage`, `pages/ProjectsPage` |
| `components/ui/FormGrid` | `components/ui/responsiveLayout.test`, `components/ui/responsiveQa.test` |
| `components/ui/HelpTooltip` | `components/ui/HelpTooltip.test`, `components/ui/KeyValueList`, `features/agent/AgentView`, `features/rag/RagView` |
| `components/ui/JsonBlock` | `components/ui/jsonDisplay.test`, `features/agent/AgentRunDetail`, `features/agent/AgentView`, `features/ai/components/ReviewsEvaluationsPanel`, `features/ai/components/RunPlaygroundPanel` |
| `components/ui/KeyValueList` | `components/ui/RunStatusPanel`, `components/ui/keyValueItems`, `components/ui/layoutPrimitives.test`, `features/agent/AgentRunDetail`, `features/agent/AgentView`, `features/ai/components/ReviewsEvaluationsPanel`, `features/rag/RagView` |
| `components/ui/MetricGrid` | `components/ui/StatCardSkeletonGrid`, `components/ui/layoutPrimitives.test`, `components/ui/responsiveLayout.test`, `components/ui/responsiveQa.test`, `features/projects/views/ProjectDetailView`, `features/rag/RagView`, `pages/DashboardPage` |
| `components/ui/PageHeader` | `components/ui/layoutPrimitives.test`, `features/agent/AgentView`, `features/rag/RagView` |
| `components/ui/PageShell` | `features/agent/AgentView`, `features/ai/views/AiStudioView`, `features/memory/MemoryView`, `features/observability/views/ObservabilityView`, `features/platform-admin/components/AdminPlatformContent`, `features/platform-admin/views/AdminPlatformView`, `features/platform/views/PlatformView`, `features/profile/views/ProfileView`, `features/projects/views/ProjectDetailView`, `features/rag/RagView`, `features/settings-admin/components/AdminSettingsContent`, `features/settings-admin/views/AdminSettingsView`, `pages/AdminUsersPage`, `pages/CalendarPage`, `pages/DashboardPage`, `pages/NotificationsPage`, `pages/ProjectsPage` |
| `components/ui/PageTabs` | `components/ui/PageTabs.test`, `features/agent/AgentView`, `features/rag/RagView` |
| `components/ui/QueryBoundary` | `components/dashboard/DashboardCalendar`, `components/ui/QueryBoundary.test`, `features/agent/AgentView`, `features/ai/components/ReviewsEvaluationsPanel`, `features/ai/components/VersionBuilderPanel`, `features/ai/views/AiStudioView`, `features/memory/MemoryDetail`, `features/memory/MemoryView`, `features/platform-admin/views/AdminPlatformView`, `features/platform/components/PlatformSections`, `features/platform/views/PlatformView`, `features/profile/components/ProfileSections`, `features/profile/views/ProfileView`, `features/projects/components/TaskEditorSection`, `features/rag/RagView`, `features/settings-admin/views/AdminSettingsView`, `pages/AdminUsersPage`, `pages/CalendarPage`, `pages/DashboardPage`, `pages/NotificationsPage`, `pages/ProjectsPage` |
| `components/ui/ResponsiveCardGrid` | `components/ui/MetricGrid`, `components/ui/layoutPrimitives.test`, `components/ui/responsiveQa.test` |
| `components/ui/RunStatusChip` | `components/ui/RunStatusPanel`, `components/ui/a11y.phase21.test`, `components/ui/runStatusModel.test`, `features/agent/AgentView`, `features/rag/RagView` |
| `components/ui/RunStatusPanel` | `components/ui/a11y.phase21.test`, `components/ui/runStatusModel.test`, `features/agent/AgentView`, `features/rag/RagView` |
| `components/ui/ScrollRegion` | `components/ui/ScrollRegion.test` |
| `components/ui/SectionCard` | `components/dashboard/DashboardCalendar`, `components/ui/ContextInspector`, `features/agent/AgentRunDetail`, `features/agent/AgentView`, `features/ai/components/PromptLibraryPanel`, `features/ai/components/RetrievalDocumentsPanel`, `features/ai/components/ReviewsEvaluationsPanel`, `features/ai/components/RunPlaygroundPanel`, `features/ai/components/VersionBuilderPanel`, `features/memory/MemoryDetail`, `features/memory/MemoryView`, `features/observability/components/InvestigationContextFields`, `features/observability/components/ObservabilityHealthGrid`, `features/observability/components/ObservabilityShortcuts`, `features/platform-admin/components/CloneConfigSection`, `features/platform-admin/components/FlagsSection`, `features/platform-admin/components/PlansSection`, `features/platform-admin/components/TemplatesSection`, `features/platform/components/PlatformSections`, `features/profile/components/ProfileSections`, `features/projects/components/ProjectFlowSection`, `features/projects/components/TaskEditorSection`, `features/rag/RagView`, `features/settings-admin/components/ConfigSettingsSection`, `features/settings-admin/components/DatabaseSettingsSections`, `pages/AdminUsersPage`, `pages/DashboardPage`, `pages/NotificationsPage`, `pages/ProjectsPage` |
| `components/ui/SkipToContentLink` | `components/layout/AppLayout`, `components/ui/a11y.phase21.test` |
| `components/ui/StatCard` | `features/ai/views/AiStudioView`, `features/platform-admin/components/AdminPlatformStats`, `features/platform/views/PlatformView`, `features/projects/views/ProjectDetailView`, `features/settings-admin/components/AdminSettingsContent`, `pages/AdminUsersPage`, `pages/DashboardPage`, `pages/NotificationsPage` |
| `components/ui/StatCardSkeletonGrid` | `features/ai/views/AiStudioView`, `features/projects/views/ProjectDetailView` |
| `components/ui/TruncatedCell` | `components/ui/DataTable.test`, `components/ui/DataTable` |
| `components/ui/WorkspaceSplit` | `components/ui/responsiveLayout.test`, `components/ui/responsiveQa.test` |
| `components/ui/dataTableTokens` | `components/ui/DataTable`, `components/ui/TruncatedCell` |
| `components/ui/jsonDisplay` | `components/ui/JsonBlock`, `components/ui/jsonDisplay.test`, `features/agent/AgentRunDetail`, `features/agent/AgentView`, `features/ai/components/ReviewsEvaluationsPanel` |
| `components/ui/keyValueItems` | `components/ui/layoutPrimitives.test` |
| `components/ui/layoutTokens` | `components/ui/ContextInspector`, `components/ui/EmptyState`, `components/ui/FormGrid`, `components/ui/PageHeader`, `components/ui/PageShell`, `components/ui/ResponsiveCardGrid`, `components/ui/SectionCard`, `components/ui/WorkspaceSplit`, `components/ui/responsiveQa.test` |
| `components/ui/responsiveQa` | `components/ui/ResponsiveCardGrid`, `components/ui/ScrollRegion`, `components/ui/responsiveQa.test` |
| `components/ui/runStatusModel` | `components/ui/RunStatusChip`, `components/ui/RunStatusPanel`, `components/ui/runStatusModel.test` |
| `components/ui/themeSurfaces` | `components/notifications/NotificationListItem`, `components/ui/DataTable`, `components/ui/JsonBlock`, `components/ui/SectionCard`, `components/ui/StatCard`, `components/ui/themeSurfaces.test`, `pages/DashboardPage` |

## Complete direct import index

Direct package imports occur in **98** source files (8 test files). Entries show source exports and local aliases. Paths are relative to `frontend/src/`. The Vite package-name references are build configuration, separate from these imports.

| File | Imports |
| --- | --- |
| `app/RouteErrorBoundary` | `@mui/material` — `Button`, `Stack`, `Typography` |
| `app/SnackbarProvider` | `@mui/material` — `Alert`, `Snackbar` |
| `app/providers` | `@mui/material` — `ThemeProvider`, `CssBaseline`, `useMediaQuery`<br>`@mui/x-date-pickers` — `LocalizationProvider`<br>`@mui/x-date-pickers/AdapterDayjs` — `AdapterDayjs` |
| `app/router` | `@mui/material` — `Box`, `Button`, `Skeleton`, `Stack`, `Typography` |
| `app/snackbarContext` | `@mui/material` — `type AlertColor` |
| `app/theme` | `@mui/material/styles` — `alpha`, `createTheme`, `type PaletteMode` |
| `components/auth/AuthMarketingPanel` | `@mui/material` — `Box`, `Stack`, `Typography` |
| `components/auth/AuthShell` | `@mui/material` — `Box`, `Container`, `Paper` |
| `components/dashboard/DashboardCalendar` | `@mui/material` — `Box`, `Button`, `Skeleton`, `Stack`<br>`@mui/icons-material` — `ChevronLeft → ChevronLeftIcon`, `ChevronRight → ChevronRightIcon` |
| `components/guards/ProtectedRoute` | `@mui/material` — `Box`, `CircularProgress` |
| `components/layout/AppLayout` | `@mui/material` — `AppBar`, `Avatar`, `Box`, `Button`, `Drawer`, `IconButton`, `List`, `ListItemButton`, `ListItemIcon`, `ListItemText`, `Stack`, `Toolbar`, `Tooltip`, `Typography`, `useMediaQuery`<br>`@mui/icons-material` — `CalendarMonth → CalendarIcon`, `ChevronLeft → ChevronLeftIcon`, `ChevronRight → ChevronRightIcon`, `Dashboard → DashboardIcon`, `DarkMode → DarkModeIcon`, `FolderOpen → ProjectsIcon`, `LightMode → LightModeIcon`, `Logout → LogoutIcon`, `Menu → MenuIcon`, `Notifications → NotificationsIcon`, `Settings → SettingsIcon`, `SettingsBrightness → SystemModeIcon`<br>`@mui/material/styles` — `useTheme` |
| `components/layout/NotificationNavBadge` | `@mui/material` — `Badge` |
| `components/layout/SettingsTabs` | `@mui/material` — `Box`, `Tab`, `Tabs`<br>`@mui/material/styles` — `alpha` |
| `components/notifications/NotificationListItem` | `@mui/material` — `Box`, `Button`, `Chip`, `Stack`, `Typography`<br>`@mui/material/styles` — `alpha` |
| `components/ui/AdvancedSettings` | `@mui/material` — `Accordion`, `AccordionDetails`, `AccordionSummary`, `Typography`, `type SxProps`, `type Theme`<br>`@mui/icons-material` — `ExpandMore → ExpandIcon` |
| `components/ui/ContextInspector` | `@mui/material` — `Box`, `IconButton`, `Stack`, `Typography`, `type SxProps`, `type Theme`<br>`@mui/icons-material` — `Close → CloseIcon` |
| `components/ui/DataTable` | `@mui/material` — `Box`, `Checkbox`, `Collapse`, `IconButton`, `Menu`, `MenuItem`, `Skeleton`, `Stack`, `Table`, `TableBody`, `TableCell`, `TableContainer`, `TableHead`, `TablePagination`, `TableRow`, `TableSortLabel`, `ToggleButton`, `ToggleButtonGroup`, `Typography`<br>`@mui/icons-material` — `KeyboardArrowDown → ExpandIcon`, `KeyboardArrowRight → CollapseIcon`, `ViewColumn → ColumnsIcon`<br>`@mui/material/styles` — `type Theme` |
| `components/ui/DisabledWithReason.test` | `@mui/material` — `Button`, `ThemeProvider`, `createTheme` |
| `components/ui/DisabledWithReason` | `@mui/material` — `Tooltip` |
| `components/ui/EmptyState` | `@mui/material` — `Box`, `Stack`, `Typography` |
| `components/ui/FormGrid` | `@mui/material` — `Box`, `type SxProps`, `type Theme` |
| `components/ui/HelpTooltip.test` | `@mui/material/styles` — `ThemeProvider`, `createTheme` |
| `components/ui/HelpTooltip` | `@mui/material` — `Box`, `IconButton`, `Popover`, `Stack`, `Tooltip`, `Typography`, `type SxProps`, `type Theme`<br>`@mui/icons-material` — `HelpOutline → HelpIcon`, `InfoOutlined → InfoIcon` |
| `components/ui/JsonBlock` | `@mui/material` — `Box`, `Button`, `Stack`<br>`@mui/icons-material` — `ContentCopy → CopyIcon` |
| `components/ui/KeyValueList` | `@mui/material` — `Box`, `Typography`, `type SxProps`, `type Theme` |
| `components/ui/PageHeader` | `@mui/material` — `Box`, `IconButton`, `Menu`, `MenuItem`, `Stack`, `Typography`, `type SxProps`, `type Theme`<br>`@mui/icons-material` — `MoreVert → MoreIcon` |
| `components/ui/PageShell` | `@mui/material` — `Box`, `Container`, `Stack`, `type Breakpoint`, `type SxProps`, `type Theme` |
| `components/ui/PageTabs` | `@mui/material` — `Box`, `Tab`, `Tabs`, `type SxProps`, `type Theme` |
| `components/ui/QueryBoundary` | `@mui/material` — `Alert`, `Box`, `Button`, `CircularProgress`, `Skeleton`, `type AlertProps` |
| `components/ui/ResponsiveCardGrid` | `@mui/material` — `Box`, `type SxProps`, `type Theme` |
| `components/ui/RunStatusChip` | `@mui/material` — `Chip`, `type ChipProps` |
| `components/ui/RunStatusPanel` | `@mui/material` — `Alert`, `Box`, `Button`, `LinearProgress`, `Stack`, `Typography`<br>`@mui/icons-material` — `Replay → ReplayIcon`, `Refresh → RetryIcon` |
| `components/ui/ScrollRegion.test` | `@mui/material/styles` — `ThemeProvider`, `createTheme` |
| `components/ui/ScrollRegion` | `@mui/material` — `Box`, `type BoxProps` |
| `components/ui/SectionCard` | `@mui/material` — `Box`, `Paper`, `Stack`, `Typography`, `type SxProps`, `type Theme` |
| `components/ui/SkipToContentLink` | `@mui/material` — `Box`, `Link` |
| `components/ui/StatCard` | `@mui/material` — `Box`, `Paper`, `Skeleton`, `Stack`, `Typography`<br>`@mui/material/styles` — `alpha` |
| `components/ui/StatCardSkeletonGrid` | `@mui/material` — `Skeleton` |
| `components/ui/TruncatedCell` | `@mui/material` — `Tooltip`, `Typography`, `type TypographyProps` |
| `components/ui/WorkspaceSplit` | `@mui/material` — `Box`, `type SxProps`, `type Theme` |
| `components/ui/a11y.phase21.test` | `@mui/material/styles` — `ThemeProvider`, `createTheme` |
| `components/ui/layoutPrimitives.test` | `@mui/material/styles` — `ThemeProvider`, `createTheme` |
| `components/ui/responsiveLayout.test` | `@mui/material/styles` — `ThemeProvider`, `createTheme` |
| `components/ui/responsiveQa.test` | `@mui/material/styles` — `ThemeProvider`, `createTheme` |
| `components/ui/themeSurfaces.test` | `@mui/material/styles` — `createTheme` |
| `components/ui/themeSurfaces` | `@mui/material/styles` — `alpha`, `type Theme` |
| `features/agent/AgentRunDetail` | `@mui/material` — `Alert`, `Box`, `Chip`, `Stack`, `Typography` |
| `features/agent/AgentView` | `@mui/material` — `Alert`, `Box`, `Button`, `Chip`, `MenuItem`, `Stack`, `Table`, `TableBody`, `TableCell`, `TableHead`, `TableRow`, `TextField`, `Typography`<br>`@mui/icons-material` — `SmartToy → AgentIcon`, `PlayArrow → RunIcon` |
| `features/ai/components/PromptLibraryPanel` | `@mui/material` — `Box`, `Button`, `Chip`, `Stack`, `TextField`, `Typography`<br>`@mui/icons-material` — `PsychologyAlt → PromptIcon` |
| `features/ai/components/RetrievalDocumentsPanel` | `@mui/material` — `Box`, `Button`, `Stack`, `TextField`, `Typography`<br>`@mui/icons-material` — `Description → DocumentIcon` |
| `features/ai/components/ReviewsEvaluationsPanel` | `@mui/material` — `Alert`, `Box`, `Button`, `Chip`, `MenuItem`, `Skeleton`, `Stack`, `TextField`, `Typography`<br>`@mui/icons-material` — `Approval → ReviewIcon` |
| `features/ai/components/RunPlaygroundPanel` | `@mui/material` — `Box`, `Button`, `Chip`, `FormControlLabel`, `MenuItem`, `Stack`, `Switch`, `TextField`, `Typography`<br>`@mui/icons-material` — `AutoAwesome → AiIcon`, `PlayCircleOutline → RunIcon` |
| `features/ai/components/VersionBuilderPanel` | `@mui/material` — `Box`, `Button`, `Chip`, `FormControlLabel`, `MenuItem`, `Skeleton`, `Stack`, `Switch`, `TextField`, `Typography` |
| `features/ai/views/AiStudioView` | `@mui/material` — `Box`, `Button`, `Skeleton`, `Stack`<br>`@mui/icons-material` — `Approval → ReviewIcon`, `Dataset → DatasetIcon`, `Description → DocumentIcon`, `PsychologyAlt → PromptIcon` |
| `features/calendar/calendarDisplay` | `@mui/material/styles` — `alpha`, `type SxProps`, `type Theme` |
| `features/calendar/components/CalendarDayView` | `@mui/material` — `Box`, `Button`, `Stack`, `Typography`<br>`@mui/material/styles` — `alpha`, `useTheme` |
| `features/calendar/components/CalendarItemDrawer` | `@mui/material` — `Alert`, `Box`, `Button`, `Divider`, `Drawer`, `MenuItem`, `Stack`, `TextField`, `Typography` |
| `features/calendar/components/CalendarViews` | `@mui/material` — `Box`<br>`@mui/material/styles` — `alpha` |
| `features/calendar/components/CalendarWeekView` | `@mui/material` — `Box`, `Stack`, `Typography`<br>`@mui/material/styles` — `useTheme` |
| `features/calendar/components/DayItems` | `@mui/material` — `Box`, `Chip`, `Stack`, `Typography`<br>`@mui/icons-material` — `Event → EventIcon`, `EventAvailable → AppointmentIcon`, `TaskAlt → TaskIcon`<br>`@mui/material/styles` — `alpha` |
| `features/calendar/components/MonthDateCalendar` | `@mui/material` — `Box`, `Stack`<br>`@mui/material/styles` — `alpha`<br>`@mui/x-date-pickers` — `DateCalendar`, `PickersDay`, `type PickersDayProps`<br>`@mui/x-date-pickers/AdapterDayjs` —  |
| `features/memory/MemoryDetail` | `@mui/material` — `Alert`, `Box`, `Button`, `Chip`, `Stack`, `Typography`<br>`@mui/icons-material` — `DeleteOutline → DeleteIcon` |
| `features/memory/MemoryView` | `@mui/material` — `Alert`, `Box`, `Button`, `Chip`, `Dialog`, `DialogActions`, `DialogContent`, `DialogTitle`, `MenuItem`, `Stack`, `Table`, `TableBody`, `TableCell`, `TableHead`, `TableRow`, `TablePagination`, `TextField`, `Typography`<br>`@mui/icons-material` — `DeleteOutline → DeleteIcon`, `Memory → MemoryIcon`, `Search → SearchIcon` |
| `features/observability/components/HealthStatusCard` | `@mui/material` — `Box`, `Chip`, `Paper`, `Stack`, `Typography`<br>`@mui/material/styles` — `alpha`, `useTheme` |
| `features/observability/components/InvestigationContextFields` | `@mui/material` — `Box`, `MenuItem`, `TextField` |
| `features/observability/components/ObservabilityHealthGrid` | `@mui/material` — `Box`, `Skeleton`<br>`@mui/icons-material` — `Api → ApiIcon`, `BugReport → ErrorIcon`, `Cached → CacheIcon`, `Dns → DatabaseIcon`, `Hub → ObservabilityIcon`, `QueryStats → MetricsIcon`, `Schedule → ScheduleIcon`, `Speed → LatencyIcon`, `Storage → PrometheusIcon`, `Timeline → TracesIcon`, `Web → FrontendIcon`, `WorkHistory → WorkerIcon` |
| `features/observability/components/ObservabilityShortcutCard` | `@mui/material` — `Button`, `Chip`, `Paper`, `Stack`, `Typography`<br>`@mui/icons-material` — `OpenInNew → OpenInNewIcon` |
| `features/observability/components/ObservabilityShortcuts` | `@mui/material` — `Box`, `Skeleton`<br>`@mui/icons-material` — `Api → ApiIcon`, `Assessment → OverviewIcon`, `BugReport → ErrorIcon`, `Cached → CacheIcon`, `Dns → DatabaseIcon`, `Route → RouteIcon`, `Schedule → ScheduleIcon`, `Storage → PrometheusIcon`, `Timeline → TracesIcon`, `Web → FrontendIcon`, `WorkHistory → WorkerIcon` |
| `features/observability/views/ObservabilityView` | `@mui/material` — `Alert`, `Button`, `Stack`<br>`@mui/icons-material` — `OpenInNew → OpenInNewIcon` |
| `features/platform-admin/components/AdminPlatformStats` | `@mui/material` — `Box`<br>`@mui/icons-material` — `Extension → ExtensionIcon`, `Flag → FlagIcon`, `MailOutline → MailIcon`, `Sell → SellIcon` |
| `features/platform-admin/components/CloneConfigSection` | `@mui/material` — `Alert`, `Box`, `Button`, `MenuItem`, `Stack`, `Switch`, `TextField`, `Typography` |
| `features/platform-admin/components/FlagsSection` | `@mui/material` — `Box`, `Button`, `FormControlLabel`, `Stack`, `Switch`, `TextField`, `Typography` |
| `features/platform-admin/components/PlansSection` | `@mui/material` — `Box`, `Button`, `Chip`, `FormControlLabel`, `Stack`, `Switch`, `TextField`, `Typography` |
| `features/platform-admin/components/TemplatesSection` | `@mui/material` — `Box`, `Button`, `FormControlLabel`, `Stack`, `Switch`, `TextField`, `Typography` |
| `features/platform-admin/views/AdminPlatformView` | `@mui/material` — `Skeleton`, `Stack` |
| `features/platform/components/PlatformSections` | `@mui/material` — `Alert`, `Box`, `Button`, `Chip`, `FormControlLabel`, `Skeleton`, `Stack`, `Switch`, `TextField`, `Typography`<br>`@mui/icons-material` — `Bolt → BillingIcon`, `Flag → FlagIcon`, `Key → KeyIcon`, `Link → LinkIcon`, `Webhook → WebhookIcon`<br>`@mui/material/styles` — `alpha` |
| `features/platform/views/PlatformView` | `@mui/material` — `Alert`, `Box`, `Skeleton`<br>`@mui/icons-material` — `Bolt → BillingIcon`, `Flag → FlagIcon`, `Key → KeyIcon`, `Webhook → WebhookIcon` |
| `features/profile/components/MfaQrCode` | `@mui/material` — `Alert`, `Box`, `Paper`, `Skeleton` |
| `features/profile/components/ProfileSections` | `@mui/material` — `Alert`, `Avatar`, `Box`, `Button`, `Link`, `Stack`, `TextField`, `Typography`<br>`@mui/icons-material` — `DeleteOutline → DeleteIcon`, `Devices → DevicesIcon`, `LockOutlined → LockIcon`, `PlaceOutlined → PlaceIcon`, `Public → PublicIcon`, `UploadFile → UploadIcon`<br>`@mui/material/styles` — `alpha` |
| `features/profile/views/ProfileView` | `@mui/material` — `Box`, `Skeleton`, `Stack` |
| `features/projects/components/ProjectFlowSection` | `@mui/material` — `Box`, `Button`, `Chip`, `Divider`, `Skeleton`, `Stack`, `Tab`, `Tabs`, `Typography`<br>`@mui/icons-material` — `Add → AddIcon`, `PlaylistAddCheck → TaskIcon`, `ViewKanban → BoardIcon`, `ViewList → ListIcon`<br>`@mui/material/styles` — `alpha` |
| `features/projects/components/ProjectTaskCards` | `@mui/material` — `Box`, `Chip`, `MenuItem`, `Paper`, `Stack`, `TextField`, `Typography`<br>`@mui/icons-material` — `CalendarMonth → CalendarIcon`, `DragIndicator → DragIcon`<br>`@mui/material/styles` — `alpha` |
| `features/projects/components/TaskEditorSection` | `@mui/material` — `Alert`, `Button`, `MenuItem`, `Stack`, `TextField`<br>`@mui/icons-material` — `DeleteOutline → DeleteIcon` |
| `features/projects/views/ProjectDetailView` | `@mui/material` — `Alert`, `Box`, `Button`, `Drawer`, `IconButton`, `Skeleton`, `Stack`, `Typography`<br>`@mui/icons-material` — `ArrowBack → BackIcon`, `AssignmentTurnedIn → DoneIcon`, `CalendarMonth → CalendarIcon`, `Close → CloseIcon`, `PlaylistAddCheck → TaskIcon`, `ViewKanban → BoardIcon` |
| `features/rag/RagView` | `@mui/material` — `Alert`, `Box`, `Button`, `Chip`, `MenuItem`, `Stack`, `Table`, `TableBody`, `TableCell`, `TableHead`, `TableRow`, `TablePagination`, `TextField`, `Typography`<br>`@mui/icons-material` — `CloudUpload → UploadIcon`, `Refresh → RetryIcon`, `Search → RetrieveIcon`, `QuestionAnswer → AskIcon` |
| `features/settings-admin/components/AdminSettingsContent` | `@mui/material` — `Alert`, `Box`, `Tab`, `Tabs`<br>`@mui/icons-material` — `RestartAlt → RestartIcon`, `SettingsSuggest → SettingsIcon`, `Storage → StorageIcon`<br>`@mui/material/styles` — `alpha` |
| `features/settings-admin/components/ConfigSettingsSection` | `@mui/material` — `Alert`, `Box`, `Button`, `Chip`, `Stack` |
| `features/settings-admin/components/DatabaseSettingsSections` | `@mui/material` — `Alert`, `Box`, `Button`, `Stack`, `TextField`<br>`@mui/icons-material` — `Storage → StorageIcon` |
| `features/settings-admin/components/SettingEditors` | `@mui/material` — `Box`, `Button`, `Chip`, `IconButton`, `Stack`, `TextField`, `Typography`<br>`@mui/icons-material` — `DeleteOutline → DeleteIcon`<br>`@mui/material/styles` — `alpha` |
| `features/settings-admin/views/AdminSettingsView` | `@mui/material` — `Skeleton`, `Stack` |
| `pages/AdminUsersPage` | `@mui/material` — `Box`, `Chip`, `CircularProgress`, `InputAdornment`, `Skeleton`, `Stack`, `Switch`, `Table`, `TableBody`, `TableCell`, `TableContainer`, `TableHead`, `TablePagination`, `TableRow`, `TextField`, `Tooltip`, `Typography`, `useMediaQuery`<br>`@mui/icons-material` — `Search → SearchIcon`, `PeopleAlt → PeopleAltIcon`<br>`@mui/material/styles` — `useTheme` |
| `pages/AuthHomePage` | `@mui/material` — `Alert`, `Box`, `Button`, `Collapse`, `IconButton`, `InputAdornment`, `Stack`, `TextField`, `type TextFieldProps`, `Typography`<br>`@mui/icons-material` — `Visibility`, `VisibilityOff` |
| `pages/CalendarPage` | `@mui/material` — `Button`, `Stack`<br>`@mui/icons-material` — `ArrowForward → ArrowForwardIcon` |
| `pages/DashboardPage` | `@mui/material` — `Box`, `Button`, `Stack`, `Typography`<br>`@mui/icons-material` — `FolderOpen → ProjectsIcon`, `Notifications → NotificationsIcon`, `Security → SecurityIcon`, `VerifiedUser → VerifiedUserIcon` |
| `pages/NotificationsPage` | `@mui/material` — `Box`, `Button`, `FormControlLabel`, `Skeleton`, `Stack`, `Switch`, `Typography`<br>`@mui/icons-material` — `DoneAll → DoneAllIcon`, `MailOutline → MailOutlineIcon`, `NotificationsActive → NotificationsActiveIcon`, `Campaign → CampaignIcon` |
| `pages/ProjectsPage` | `@mui/material` — `Alert`, `Box`, `Button`, `CircularProgress`, `Drawer`, `IconButton`, `Paper`, `Skeleton`, `Stack`, `TextField`, `Typography`<br>`@mui/icons-material` — `Add → AddIcon`, `AddCircleOutline → AddCircleOutlineIcon`, `FolderOpen → FolderOpenIcon`, `ArrowForward → ArrowForwardIcon`, `Close → CloseIcon`<br>`@mui/material/styles` — `alpha` |
| `pages/ResetPasswordPage` | `@mui/material` — `Alert`, `Box`, `Button`, `Stack`, `TextField`, `Typography` |
| `pages/VerifyEmailPage` | `@mui/material` — `Alert`, `Box`, `Button`, `CircularProgress`, `Stack`, `TextField`, `Typography` |
