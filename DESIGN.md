# Fullstack Blueprint design system

This document describes the canonical design system used by the frontend. The implementation lives in [`frontend/src/app/designTokens.ts`](frontend/src/app/designTokens.ts) and is consumed by global CSS custom properties, Tailwind utilities, and shared Base UI/shadcn-compatible primitives.

## Principles

- Semantic tokens are the only source of product colors, typography, spacing, shape, motion, density, and responsive breakpoints.
- Components choose semantic roles (`primary`, `muted`, `destructive`, and so on), never a product-specific hex value.
- Light and dark themes use the same roles and preserve readable text and focus states. Color is never the only signal for status.
- The token contract is framework-independent. New components consume semantic CSS variables and shared primitives rather than introducing a second styling vocabulary.
- Motion follows the user's reduced-motion preference.

## Theme presets

The application ships four presets. Every preset supports light, dark, and system color modes.

| Preset | Primary | Intended use |
| --- | --- | --- |
| `minimal-saas` | `#2563EB` | Product dashboards and focused SaaS workflows |
| `linear-inspired` | `#5E6AD2` | Dense, keyboard-first workspaces |
| `enterprise` | `#0F766E` | Administrative and operational applications |
| `creative-ai` | `#7C3AED` | AI studios, experiments, and creative tools |

Preferences are persisted under `fullstack-blueprint.theme`. The persisted shape is validated before use, so invalid or stale preferences fall back to the safe minimal SaaS light theme.

```ts
type ThemePreferences = {
  colorMode: "light" | "dark" | "system";
  preset: "minimal-saas" | "linear-inspired" | "enterprise" | "creative-ai";
  primaryColor?: string;
  fontFamily?: string;
  radius: "none" | "sm" | "md" | "lg";
  density: "compact" | "comfortable";
};
```

The application currently exposes color-mode switching in the shell. Preset, density, radius, typography, and primary-color setters are available from `useColorMode()` so settings UI can be added without changing the token model.

## Semantic color roles

`createDesignTokens()` provides the following roles for both color modes:

`background`, `foreground`, `card`, `cardForeground`, `popover`, `popoverForeground`, `primary`, `primaryForeground`, `secondary`, `secondaryForeground`, `muted`, `mutedForeground`, `accent`, `accentForeground`, `destructive`, `destructiveForeground`, `success`, `successForeground`, `warning`, `warningForeground`, `information`, `informationForeground`, `border`, `input`, `ring`, `sidebar`, `sidebarForeground`, and five `chart` colors.

The same roles are available as CSS custom properties, including `--color-background`, `--color-foreground`, `--color-card`, `--color-primary`, `--color-muted-foreground`, `--color-destructive`, `--color-success`, `--color-warning`, `--color-information`, `--color-border`, and `--color-ring`.

## Typography

The frontend uses the bundled, open-source Manrope family for display and body text, with IBM Plex Mono for code and identifiers. The token system defines regular (400), medium (500), semibold (600), and bold (700) weights. The body baseline is `14px` with `1.5` line height. Heading and label weights are 600 and 500 respectively.

The CSS variables are `--font-family-display`, `--font-family-text`, and `--font-family-mono`; use these in CSS or pass a configured `fontFamily` through the theme preference API.

## Spacing, density, and shape

Spacing uses a four-pixel base scale:

| Token | Value |
| --- | --- |
| `xxs` | 4px |
| `xs` | 8px |
| `sm` | 12px |
| `md` | 16px |
| `lg` | 24px |
| `xl` | 32px |
| `xxl` | 48px |
| `section` | 64px |

The active radius preset controls shared controls and the `--radius` CSS property: `none` (0px), `sm` (6px), `md` (8px), and `lg` (12px). Supporting radii are available as `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, and `--radius-pill`.

`comfortable` density uses 40px controls, 24px page padding, and 24px section gaps. `compact` density uses 36px controls, 16px page padding, and 16px section gaps.

## Elevation and motion

Elevation is semantic: `flat`, `raised`, `overlay`, and `focus`. The system uses subtle shadows rather than component-specific shadow values. Motion tokens are `120ms`, `220ms`, and `360ms` with a standard cubic-bezier easing. Global CSS and shared components disable non-essential motion under `prefers-reduced-motion: reduce`.

## Responsive breakpoints

The canonical breakpoints are mobile (480px), mobile-lg (768px), tablet (1024px), desktop (1280px), and desktop-xl (1440px). CSS and Tailwind consumers can use the corresponding `--breakpoint-*` properties; components should prefer responsive layout utilities over one-off media queries.

## Accessibility and compatibility

The light and dark semantic palettes use high-contrast foregrounds for primary surfaces, semantic alerts, and focus rings. Interactive components retain visible keyboard focus and minimum 40px control heights in comfortable density. Compatibility aliases in `designTokens.ts` exist only for retained public contracts and must not be used for new components.

## Source of truth

Update [`frontend/src/app/designTokens.ts`](frontend/src/app/designTokens.ts) first when changing the design system. `cssVariablesFor()` and `applyDesignTokens()` derive the runtime CSS contract. The tests in [`frontend/src/app/designTokens.test.ts`](frontend/src/app/designTokens.test.ts) cover preset completeness, customization, CSS variable application, and preference persistence.
