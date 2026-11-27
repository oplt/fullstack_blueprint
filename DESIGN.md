# Fullstack Blueprint — Design System

## Design System Architecture

This document is the authoritative UI design specification for Fullstack Blueprint. Geist by Vercel is the visual reference, not a required runtime font or UI framework. The marketing examples below describe the visual language for optional public-facing pages; application components follow the same foundations without requiring those pages to exist.

### Source of Truth

| Layer | Responsibility |
| --- | --- |
| `DESIGN.md` | Normative design intent, token values, component roles, responsive behavior and accessibility requirements. |
| `frontend/src/index.css` | Sole application-authored stylesheet and executable source of reusable static design tokens, theme palettes, shared visual utilities and reusable component recipes. |
| `frontend/src/components/ui/` and shared layouts | shadcn/ui and Base UI primitives, semantic HTML, typed component variants, CSS recipe names and accessible interactions. |
| `frontend/src/features/` and `frontend/src/pages/` | Compose shared components and own domain behavior and component-specific structural layout. |

Resolve inconsistencies in this order: **DESIGN.md → index.css → shared components → features and pages**. When changing design intent, update this document first and implement the corresponding CSS and component changes together. Values in this document are target requirements; the implementation may temporarily differ during a staged migration.

### Implementation Rules

- Use React, TypeScript, Tailwind CSS v4, the existing shadcn/ui Base UI configuration and direct named Lucide React icons. Reuse existing primitives and local customizations.
- Do not introduce MUI, Material UI, Emotion, Bootstrap, styled-components, CSS modules, Sass, independent static theme objects, duplicate token files or additional application stylesheets.
- Define reusable static colors, typography, spacing, density, radii, shadows, overlays, z-index, motion, layout dimensions and chart tokens in `index.css`. Define reusable component appearance (including variant, size, state, hover and focus rules) in the same stylesheet, using named `.ui-*` recipes in `@layer components`. Components select recipes with typed props, `cn()`, CVA or data attributes. Semantic Tailwind utilities and CSS variable references remain available for one-off composition. Do not duplicate reusable design values or visual recipes in JSX or TypeScript.
- Structural utilities such as `flex`, `grid`, `items-center`, `min-w-0`, `w-full` and `overflow-hidden` remain appropriate in React components. Keep local structure near the component; do not move every utility into CSS.
- Use `cn()` and existing CVA variants to select CSS recipes rather than long visual utility strings. Keep caller-supplied utility overrides in the utilities layer; verify state and variant precedence in browser tests. Do not construct arbitrary dynamic Tailwind classes, hardcode static palettes or use static inline visual styles as a second styling system.
- Essential framework, local font and third-party styles are allowed. Runtime-computed geometry, numeric properties required by third-party rendering APIs (such as Recharts bar radii), safely validated dynamic branding values, and library-required visual primitives are allowed when narrowly scoped and documented. Dynamic values must not override the canonical design system indiscriminately.
- Theme preference logic, application providers, Storybook decorators and pre-paint initialization may manage theme state; they must not define independent static palettes. PWA metadata should derive from canonical CSS tokens.
- Preserve semantic HTML, accessible names, keyboard operation, focus management, reduced motion, responsive behavior and internationalization. Target WCAG 2.2 AA in both themes.
- Use existing design validation, lint, component tests, Storybook and browser tests to enforce this contract. Exceptions must identify the affected code, the reason and the specific rule being exempted.

## Overview

Vercel's Geist system is an exercise in subtraction. In light mode, the page is a near-white sheet (`{colors.canvas}` — #fafafa) carrying near-black ink (`{colors.ink}` — #171717), and almost nothing else competes. Headings, body copy, primary buttons, and the thin 1px borders that define every card all draw from the same ink-and-grey ladder. The only large decorative use of color is the hero, where a soft multi-stop **mesh gradient** — cyan, blue, violet, magenta, amber — blooms behind or beside the headline. Application color is reserved for semantic feedback, links, focus, data visualization and necessary event distinctions. Everywhere else, restraint.

Typography does the heavy lifting. **Inter**, when locally available, or the platform UI sans-serif fallback sets the display headline in tightly-tracked weight-600 (the hero h1 runs -2.4px letter-spacing), and **IBM Plex Mono** appears as small uppercase eyebrows labeling sections like a technical spec sheet. Buttons split into two shapes by context: the marketing CTAs are fully rounded primary **pills** (`{rounded.pill}` — 100px, "Start Deploying" / "Get a Demo"), while nav and in-app controls use a tight 6px square (`{rounded.sm}`, "Sign Up" / "Log In"). The contrast between the rounded marketing pill and the square app button is itself a deliberate signal of which surface you're on.

Surfaces barely lift. In light mode, cards are white (`{colors.canvas-elevated}`) on the #fafafa canvas, separated by a 1px hairline (`{colors.hairline}` — #ebebeb) and, at most, a whisper-soft layered shadow. Feature sections are built from precise grids of these hairline cards, often holding thin node-graph or code-editor illustrations rendered in the same ink-on-white palette. The page reads like documentation that happens to be selling something — engineered, exact, and confident enough to let a single gradient be the only flourish.

**Key Characteristics:**
- A near-black ink and neutral grey ladder carry headings, body, primary CTAs and hairline borders on a near-white canvas in light mode; dark mode uses the same semantic roles with inverted neutral surfaces and text.
- The multi-stop mesh gradient (cyan → blue → violet → magenta → amber) is the entire decorative system, confined to the hero.
- Two button shapes by context: rounded primary **pills** (`{rounded.pill}`) for marketing CTAs, tight 6px squares (`{rounded.sm}`) for nav/app controls.
- Inter or system UI sans-serif for tightly-tracked display type (`{typography.display-xl}` at -2.4px), IBM Plex Mono for uppercase technical eyebrows (`{typography.mono-eyebrow}`).
- Hairline-bordered white cards (`{colors.hairline}` on `{colors.canvas-elevated}`) in precise grids; depth via 1px border + whisper shadow, never heavy elevation.
- The classic Vercel gradient trio (develop/preview/ship) survives as a named accent system: `{colors.gradient-develop-start}`→end, preview, ship.
- Optional marketing page rhythm: neutral hero with mesh gradient → logo strip → hairline feature-card grid → code-editor band → template cards → CTA band → muted footer. Application workspaces use tighter, functional spacing.

## Colors

> Visual references from the original specification: Vercel’s home page, AI Gateway page, customers page and pricing page. Values below define the blueprint’s own design contract, including light and dark application themes.

### Brand & Accent
- **Ink** (`{colors.primary}` / `{colors.ink}` — #171717): the brand's defining near-black. Headings, primary CTA fill, logo, and the darkest text tier. Paired with `{colors.on-primary}` (white).
- **Vercel Blue** (`{colors.link}` — #0070f3): the link and accent blue — inline links, pricing highlights, focus signals. Darker press tone `{colors.link-deep}` (#0761d1), pale wash `{colors.link-soft}` (#d3e5ff).
- **Violet** (`{colors.violet}` — #7928ca), **Cyan** (`{colors.cyan}` — #50e3c2), **Pink** (`{colors.pink}` — #ff0080), **Magenta** (`{colors.magenta}` — #eb367f): the chromatic accent family, used sparingly for illustration accents and as mesh-gradient stops, never as chrome fills.

### Surface
- **Canvas** (`{colors.canvas}` — #fafafa): the default page background — the near-white sheet everything sits on.
- **Elevated** (`{colors.canvas-elevated}` — #ffffff): pure white for cards, buttons, inputs, and code blocks lifted off the canvas.
- **Hairline-Soft Surface** (`{colors.hairline-soft}` — #f2f2f2): the faintest grey fill for subtle alternating panels and inset wells.

### Text
- **Ink** (`{colors.ink}` — #171717): primary headings and high-emphasis text.
- **Body** (`{colors.body}` — #4d4d4d): standard paragraph and secondary copy, nav links.
- **Readable muted content** (`--content-muted`, `--muted-foreground` — #6b6b6b): captions, metadata, placeholders and secondary descriptions that users need to read.
- **Mute** (`{colors.mute}` — #8f8f8f) and **Faint** (`{colors.faint}` — #a1a1a1): decorative or genuinely inactive content only where contrast exemptions apply. Do not use these light-mode tones for essential normal-size text.

### Borders
- **Hairline** (`{colors.hairline}` — #ebebeb): the decorative 1px border on cards and dividers. Controls whose boundaries are necessary to identify them use the accessible `--input` color, not the decorative hairline.

### Semantic
- **Error** (`{colors.error}` — #ee0000): validation / destructive, with a deep press tier `{colors.error-deep}` (#c50000).
- **Warning** (`{colors.warning}` — #f5a623): caution states, with soft `{colors.warning-soft}` and deep `{colors.warning-deep}` tiers.
- **Success** maps to `{colors.link}` (#0070f3 in light mode) — blue doubles as the positive signal. Use text and icons to distinguish success from information.
- **Information** uses the deeper blue link family and a readable foreground. Never use color alone to communicate a state.

### Brand Gradient
Three named two-stop gradients form the legacy Vercel gradient identity, surviving as illustration and accent washes:
- **Develop**: `{colors.gradient-develop-start}` (#007cf0) → `{colors.gradient-develop-end}` (#00dfd8) — blue to cyan.
- **Preview**: `{colors.gradient-preview-start}` (#7928ca) → `{colors.gradient-preview-end}` (#ff0080) — violet to pink.
- **Ship**: `{colors.gradient-ship-start}` (#ff4d4d) → `{colors.gradient-ship-end}` (#f9cb28) — red to amber.
These, blended together, form the hero's multi-stop mesh.

### Light and Dark Theme Palettes

Support `light`, `dark` and `system` preferences. System mode resolves to the current operating-system preference and updates when it changes. The light palette is the default CSS root; the dark palette is activated by the existing `data-theme="dark"` and `.dark` root markers, which must remain synchronized. Component styles use the same semantic tokens in both modes rather than introducing local dark palettes. The browser color scheme, overlays, portals, toasts, charts, and pre-paint initialization must follow the resolved mode.

The following table specifies target CSS token values. Aliases such as `var(--content-muted)` and `var(--link)` are intentional. Most values preserve the existing `index.css` palette; accessible control borders, readable muted text and the dark information foreground are explicit corrections for subsequent implementation. `--sidebar-ring` follows `--ring`.

| CSS token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--background` | `#fafafa` | `#000000` | Canvas |
| `--foreground` | `#171717` | `#ededed` | Primary text |
| `--card` | `#ffffff` | `#111111` | Elevated content |
| `--card-foreground` | `#171717` | `#ededed` | Card content |
| `--popover` | `#ffffff` | `#111111` | Floating surface |
| `--popover-foreground` | `#171717` | `#ededed` | Floating content |
| `--primary` | `#171717` | `#ffffff` | Primary action |
| `--primary-foreground` | `#ffffff` | `#000000` | Primary action text |
| `--secondary` | `#f2f2f2` | `#1a1a1a` | Secondary action |
| `--secondary-foreground` | `#171717` | `#ededed` | Secondary action text |
| `--muted` | `#f2f2f2` | `#1a1a1a` | Subtle surface |
| `--muted-foreground` | `var(--content-muted)` | `var(--content-muted)` | Readable secondary text |
| `--accent` | `#f2f2f2` | `#1a1a1a` | Neutral hover/selection surface |
| `--accent-foreground` | `#171717` | `#ededed` | Accent surface text |
| `--border` | `#ebebeb` | `#333333` | Decorative hairline |
| `--input` | `#767676` | `#737373` | Essential control boundary |
| `--ring` | `#0070f3` | `#0070f3` | Focus indication |
| `--ink` | `var(--foreground)` | `var(--foreground)` | High-emphasis text |
| `--body-strong` | `#333333` | `#d4d4d4` | Strong body copy |
| `--body` | `#4d4d4d` | `#a1a1a1` | Secondary body copy |
| `--content-muted` | `#6b6b6b` | `#a1a1a1` | Readable muted text |
| `--mute` | `#8f8f8f` | `#a1a1a1` | Low-emphasis decoration |
| `--faint` | `#a1a1a1` | `#737373` | Inactive/decorative content |
| `--link` | `#0070f3` | `#4d9aff` | Accent blue |
| `--link-text` | `#0066e0` | `#83b7ff` | Readable link text |
| `--link-pressed` | `#0761d1` | `#3985e6` | Link pressed/hover |
| `--link-soft` | `#d3e5ff` | `#16365e` | Subtle link highlight |
| `--destructive` | `#ee0000` | `#ee0000` | Error accent |
| `--destructive-foreground` | `#ffffff` | `#000000` | Filled error text |
| `--destructive-deep` | `#c50000` | `#ff6666` | Readable error text |
| `--success` | `var(--link)` | `var(--link)` | Success accent |
| `--success-foreground` | `#ffffff` | `#000000` | Filled success text |
| `--success-deep` | `var(--link-pressed)` | `var(--link-pressed)` | Readable success text |
| `--warning` | `#f5a623` | `#f5a623` | Caution accent |
| `--warning-foreground` | `#171717` | `#171717` | Filled caution text |
| `--warning-deep` | `#8a4f00` | `#ffc266` | Readable caution text |
| `--information` | `var(--link-pressed)` | `var(--link-pressed)` | Information accent |
| `--information-foreground` | `#ffffff` | `#000000` | Filled information text |
| `--sidebar` | `#ffffff` | `#0a0a0a` | Navigation surface |
| `--sidebar-foreground` | `#171717` | `#ededed` | Navigation text |
| `--sidebar-primary` | `#171717` | `#ffffff` | Main sidebar action |
| `--sidebar-primary-foreground` | `#ffffff` | `#000000` | Sidebar action text |
| `--sidebar-accent` | `#f2f2f2` | `#1a1a1a` | Navigation active/hover surface |
| `--sidebar-accent-foreground` | `#171717` | `#ededed` | Active navigation text |
| `--sidebar-border` | `#ebebeb` | `#333333` | Navigation divider |

Keep semantic aliases coherent: `--surface-soft` follows `--muted`, `--surface-card` follows `--card`, `--hairline` follows `--border`, and `--hairline-soft` follows `--muted` in both themes. The documentation names `{colors.canvas}`, `{colors.canvas-elevated}`, `{colors.on-primary}`, `{colors.error}`, `{colors.error-deep}`, and `{colors.link-deep}` map to `--background`, `--card`, `--primary-foreground`, `--destructive`, `--destructive-deep`, and `--link-pressed` respectively; these are not additional independent palettes.

Semantic soft surfaces are derived with `color-mix(in srgb, …)` from the matching semantic color: success and destructive use 10% accent over white in light mode; warning uses 14%; all three use 16% accent over black in dark mode. Pair them with the corresponding `-deep` text token and verify contrast on the actual mixed surface. Do not independently hardcode soft colors inside badges or alerts. For information, use an approved link-soft surface with readable link text or the filled information pair.

#### Interaction States and Contrast

| State | Design requirement |
| --- | --- |
| Default | Semantic foreground/background and the appropriate border. |
| Hover | Neutral accent or a derived semantic hover tone; preserve text and control contrast. |
| Pressed / selected | Primary or accent treatment with a visible selection indicator and appropriate accessible state. |
| Focus-visible | Visible ring using `--ring`, normally 3px with sufficient separation from the control. Verify contrast against neighboring surfaces; provide a contrasting offset when necessary. |
| Disabled | Shared subdued treatment, native/ARIA semantics as appropriate, and no unintended interaction; do not use disabled styling for essential readable content. |
| Invalid | Destructive boundary, readable error message and accessible association with the relevant field. |
| Loading | Preserve the layout and accessible name; prevent duplicate submission where applicable. |

Normal-size text, including placeholders and meaningful metadata, must meet 4.5:1 contrast; large text (at least 24 CSS px regular, or approximately 18.67 CSS px bold) must meet 3:1. Essential non-text controls, selection cues and focus indicators must meet 3:1 against relevant adjacent colors. Decorative borders need not meet the control-boundary threshold. Verify actual rendered combinations, including opacity, hover and dark-mode variants. Status must never rely on color alone. Inactive controls have WCAG contrast exceptions, but readable surrounding explanations remain required.

### Data Visualization Palette

Charts are an explicit exception to the neutral application chrome. Use the existing five theme-aware chart roles, in order, for categorical series. Semantic success, warning, destructive and information colors may be used when they convey an actual status rather than arbitrary categories.

| CSS token | Light | Dark |
| --- | --- | --- |
| `--chart-1` | `#0070f3` | `#4d9aff` |
| `--chart-2` | `#7928ca` | `#b58aff` |
| `--chart-3` | `#007a66` | `#50e3c2` |
| `--chart-4` | `#cc0066` | `#ff5ca8` |
| `--chart-5` | `#8a6200` | `#f9cb28` |

Use readable muted foreground for axes and labels, decorative border for nonessential grid lines, and popover tokens for chart tooltips. Distinguish series with labels, shapes, patterns or line styles when color is insufficient. Provide an accessible summary or data table. Recharts and necessary SVG geometry remain permitted; reusable visual properties belong in `index.css`.

## Typography

### Font Family
The sans stack prefers **Inter** when locally installed and falls back to platform UI sans-serif fonts before Arial. No extra sans font is downloaded. **IBM Plex Mono** is self-hosted for code and technical labels. Geist remains the visual reference, not a runtime font dependency.

| Role | Canonical CSS stack |
| --- | --- |
| Sans / display | `Inter, ui-sans-serif, system-ui, Arial, sans-serif` |
| Monospace | `"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace` |

Local font availability can vary by operating system; pixel-identical cross-platform typography is not a requirement. Use the existing local IBM Plex Mono 400 and 500 weights; do not fetch external font services.

### Hierarchy

| Token                          | Size | Weight | Line Height | Letter Spacing | Use                                    |
| ------------------------------ | ---- | ------ | ----------- | -------------- | -------------------------------------- |
| `{typography.display-xl}`      | 48px | 600    | 48px        | -2.4px         | Marketing hero headline                |
| `{typography.display-lg}`      | 32px | 600    | 40px        | -1.28px        | Major section and document headings    |
| `{typography.page-title}`      | 24px | 600    | 32px        | -0.48px        | Application page title                 |
| `{typography.display-md}`      | 20px | 600    | 28px        | -0.4px         | Dense page / sub-section / card titles |
| `{typography.display-sm}`      | 16px | 600    | 24px        | 0              | Small document headings                |
| `{typography.label-sm}`        | 14px | 500    | 20px        | -0.28px        | Strong labels, nav emphasis            |
| `{typography.mono-eyebrow}`    | 12px | 500    | 16px        | 0              | Uppercase IBM Plex Mono section labels |
| `{typography.body-lg}`         | 16px | 400    | 24px        | 0              | Lead paragraphs, large body            |
| `{typography.body-md}`         | 14px | 400    | 20px        | 0              | Default body, nav links, table cells   |
| `{typography.body-sm}`         | 12px | 400    | 16px        | 0              | Captions, footnotes, metadata          |
| `{typography.button-lg}`       | 16px | 500    | 20px        | 0              | Marketing pill button labels           |
| `{typography.button-md}`       | 14px | 500    | 20px        | 0              | Nav / app button labels                |
| `{typography.code}`            | 14px | 400    | 20px        | 0              | Code blocks, inline code (IBM Plex)    |

### Principles
- Display type is defined by tight negative tracking — the larger the heading, the tighter (-2.4px at hero scale, -1.28px at section scale). Body type sits at neutral spacing.
- Use three primary weights: 600 for display headings, 500 for buttons/labels and compact headings, and 400 for body text. Avoid decorative light, black or italic UI variants; preserve meaningful emphasis and semantic formatting in user-authored content.
- IBM Plex Mono is reserved for two roles only — code, and the small uppercase eyebrow labels that introduce technical sections.

### Note on Font Substitutes
Use the canonical font stacks above. Preserve negative display tracking and avoid independent component-level type scales. Implement typography roles through semantic Tailwind utilities (`text-page-title`, `text-display-md`, `text-body-md`, etc.) mapped in `index.css`. Compact card titles use the body-sm size and line height with label weight 500. Mobile form inputs use 16px text to prevent unwanted focus zoom; desktop form inputs use the default 14px body role.

## Layout

### Spacing System
- **Base unit**: 4px. The scale steps 4 → 8 → 12 → 16 → 24 → 32 → 40 → 64 → 96 → 128px.
- **Tokens**: `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 16px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.2xl}` 40px · `{spacing.3xl}` 64px · `{spacing.4xl}` 96px · `{spacing.section}` 128px.
- **Card interiors** sit at `{spacing.lg}`–`{spacing.xl}` (24–32px); **section bands** run `{spacing.4xl}`–`{spacing.section}` (96–128px) of vertical rhythm.
- **Button padding** is horizontal-only — marketing pills run `0px 14px`, nav buttons `0px 6px` — with a 44px target height for primary application and marketing controls. The line height defines the label typography, not the full touch target.

### Grid & Container
- Centered application content is capped at 1200px with 12px mobile gutters and 24px gutters from 640px upward. Compact layouts cap at 600px, readable layouts at 900px, explicit wide layouts at 1440px; full workspace layouts remain fluid. `PageShell` owns page-specific width; the application shell owns chrome and page gutters without applying duplicate constraints.
- Feature sections use 2-up, 3-up, and 4-up hairline-card grids that collapse toward 1-up on narrow widths.
- Card grids follow the available page-content width: one column below 640px, two at 640px, three at 960px, and four at 1200px. This keeps dashboard grids responsive when a sidebar or split workspace reduces their width.
- The pricing page uses a multi-column tier grid; the customers page a logo / case-study grid.

### Whitespace Philosophy
Whitespace is structural. The near-white canvas and generous section padding do the separating work; cards are grouped by thin hairlines rather than heavy backgrounds. The page breathes — large vertical gaps between bands, tight internal rhythm inside cards.

### Responsive Strategy

#### Viewport Breakpoints

Viewport breakpoints control navigation, shell layout and responsive gutters. Use the existing Tailwind breakpoint scale; these thresholds assume the standard 16px initial font size.

| Name | Minimum width | Key changes |
| --- | --- | --- |
| Base | 0 | Single-column layout, mobile drawer navigation; hero text scales down. |
| `sm` | 640px / 40rem | Desktop page gutters (24px); allow multi-column content when its container permits. |
| `md` | 768px / 48rem | Persistent application sidebar; mobile navigation drawer no longer required. |
| `lg` | 1024px / 64rem | Wider layouts; optional authentication marketing panel. |
| `xl` | 1280px / 80rem | Larger workspace layouts and marketing typography. |
| `2xl` | 1536px / 96rem | Additional wide-screen room without exceeding the selected container cap. |

#### Content Container Breakpoints

Page-content container queries, not viewport width alone, control the responsive card grid. The selected grid variant may cap the number of columns further.

| Available content width | Maximum card columns |
| --- | --- |
| Below 640px | 1 |
| 640px and above | 2 |
| 960px and above | 3 |
| 1200px and above | 4 |

Forms and split workspaces follow their documented ratios and collapse before content becomes unusable. Prefer CSS responsiveness over JavaScript viewport detection; when JS is necessary, keep its threshold synchronized with the canonical CSS breakpoint. CSS query syntax may require literal or compile-time breakpoint values; validate their consistency rather than using unsupported custom-property substitutions.

#### Touch Targets
Marketing pill CTAs (`{components.button-primary}`) and primary application controls target at least 44×44 CSS px. Compact secondary and calendar controls may use smaller targets when appropriate, but must satisfy WCAG 2.2 AA Target Size (Minimum), generally 24×24 CSS px or an applicable spacing or other exception, with accessible keyboard alternatives where needed.

#### Collapsing Strategy
The nav row collapses behind a menu trigger; multi-column hairline-card grids reflow to a single column; code-editor and node-graph illustrations scale or scroll rather than shrink illegibly; the pricing tier grid stacks vertically.

#### Image Behavior
The hero mesh gradient is a CSS/SVG composition that scales fluidly. Feature illustrations (node graphs, code editors) are vector/HTML, using theme-aware ink and surfaces, scaling crisply. Customer logos sit in a greyscale strip. No heavy raster photography.

## Elevation & Depth

| Level        | Treatment                                                                                  | Use                                                 |
| ------------ | ------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| 0 — Flat     | 1px hairline (`{colors.hairline}`), no shadow                                              | Default feature cards, dividers, the canvas |
| 1 — Whisper  | Border + `0px 1px 1px rgba(0,0,0,0.04)` micro-shadow                                       | Lightly-raised cards                                |
| 2 — Floating | Layered soft shadow (`0px 2px 2px` + `0px 8px 16px -4px` low-alpha black) + inset hairline | Menus, modals, tooltips                             |

Depth is deliberately minimal. The system prefers a crisp 1px hairline plus the near-white-on-white surface step to a shadow; when a surface floats, it uses a finely-layered, very-low-alpha shadow stack rather than a single heavy drop.

### Overlays and Stacking

The common overlay surface uses popover background/foreground, a hairline and Level-2 shadow. Standard dialogs and alert dialogs use a 16px radius and 24px padding. Menus and popovers use 12px radius, with padding appropriate to their content (4px menus, 12px general popovers). Drawers retain edge-attached geometry and a nominal 288px width, constrained to the viewport. The canonical modal backdrop is black at 40% opacity in both modes; use a semantic `--overlay-background` token, not foreground-dependent or hardcoded component colors. In dark mode, use the surface and border to maintain depth when black shadows are visually subtle.

| Layer | CSS token | Base value |
| --- | --- | --- |
| Sticky header | `--z-sticky` | 20 |
| Sidebar | `--z-sidebar` | 30 |
| Modal backdrop | `--z-overlay` | 40 |
| Popover / menu | `--z-popover` | 50 |
| Dialog / sheet | `--z-dialog` | 60 |
| Tooltip | `--z-tooltip` | 70 |
| Toast | `--z-toast` | 80 |

These are base layers, not an instruction to place a child popover underneath its parent dialog. Shared Base UI portal backdrops, dialogs, floating positioners and tooltip positioners use the common `--z-portal-stack` token (alias of `--z-dialog`) so adjacent portal ordering can keep nested overlays above the parent. Preserve DOM ordering and verify hit testing in browser tests. Preserve the Base UI portal and nested overlay stacking model; verify selects, tooltips, menus, date pickers and nested dialogs remain above their parent surface.

### Motion

Motion supports feedback and continuity, not decoration. Use centralized durations of 100ms (fast hover and feedback), 220ms (normal transitions and modal entry), and 320ms (larger drawer transitions, when needed), with the existing `cubic-bezier(0.2, 0, 0, 1)` easing as the default. Use only defined animation utilities and state transitions supported by the existing UI primitives. Preserve positioning transforms and exit lifecycles. Respect `prefers-reduced-motion` for CSS and library-managed animations; avoid unnecessary animation and continuous movement.

### Decorative Depth
The hero **mesh gradient** is the only atmospheric element — a soft multi-stop bloom of the brand accent colors against the white canvas. Feature illustrations (ink node-graphs, code editors) add a sense of product depth without color. No glows, no heavy gradients elsewhere.

## Shapes

### Border Radius Scale

| Token                     | Value  | Use                                             |
| ------------------------- | ------ | ----------------------------------------------- |
| `{rounded.none}`          | 0px    | Full-bleed bands, dividers                      |
| `{rounded.sm}`            | 6px    | Nav / app buttons, inputs                       |
| `{rounded.md}`            | 12px   | Feature cards, code blocks                      |
| `{rounded.lg}`            | 16px   | Pricing cards, larger panels                    |
| `{rounded.pill-category}` | 64px   | Category-tab pills (AI Apps / Web Apps)         |
| `{rounded.pill}`          | 100px  | Marketing CTA pills                             |
| `{rounded.full}`          | 9999px | Circular icon buttons, avatars, marketing nav ghost links |

The radius language is bimodal: tight 6px squares for functional chrome, full pills for marketing CTAs and category tabs, with 12–16px on content cards in between.

### Calendar Interaction Exceptions

Calendar date markers, week-number labels, event color dots, and selected-event resize handles retain circular geometry because those shapes communicate date and interaction states. FullCalendar render hooks remain in place for event placement, dragging, resizing, and narrow touch targets. Calendar print output intentionally uses white paper and black text/borders for contrast, regardless of the active theme. Event and overflow-link color mixes, popover elevation, and stacking use the calendar and shared overlay tokens in `frontend/src/index.css`.

### Geometry
Cards are rectangles at 12–16px radius; marketing buttons and category tabs are full pills; icon buttons and avatars are circular. Illustrations are line-weight vector graphics using the active theme’s ink and surface.

## Components

> Component roles below are normative. Use the interaction-state and contrast requirements in the Colors section for default, hover, focus, pressed/selected, disabled, invalid and loading states where applicable. Marketing examples are optional; they do not mandate particular product pages.

### Navigation

**`nav-bar`** — top navigation
- Background `{colors.canvas}`, bottom hairline `{colors.hairline}`, text `{colors.body}`, type `{typography.body-md}`, padding `{spacing.sm} {spacing.lg}`. Holds the theme-aware wordmark, ghost nav links, and the Sign Up / Log In buttons at right.

**`nav-link`** — individual nav item
- Body-grey text `{colors.body}`, type `{typography.body-md}`, fully rounded hit area `{rounded.full}`, padding `{spacing.xs} {spacing.sm}`. Transparent until interacted.

### Buttons

**`button-primary`** — the primary marketing pill (black in light mode, white in dark mode) ("Start Deploying", "Deploy")
- Background `{colors.primary}`, text `{colors.on-primary}`, type `{typography.button-lg}`, fully rounded `{rounded.pill}` (100px), padding `0px 14px`.

**`button-secondary`** — the neutral elevated marketing pill ("Get a Demo")
- Background `{colors.canvas-elevated}`, text `{colors.ink}`, type `{typography.button-lg}`, rounded `{rounded.pill}`, padding `0px 14px`. Same pill shape as primary, inverted fill.

**`button-primary-sm`** — the compact primary nav CTA ("Sign Up")
- Background `{colors.primary}`, text `{colors.on-primary}`, type `{typography.button-md}`, tight square `{rounded.sm}` (6px), padding `0px 6px`.

**`button-ghost-sm`** — the neutral outlined nav/app button ("Log In", "Ask AI")
- Background `{colors.canvas-elevated}`, text `{colors.ink}`, 1px hairline `{colors.hairline}`, type `{typography.button-md}`, rounded `{rounded.sm}`, padding `0px 6px`.

**`button-category-pill`** — the category-tab pill ("AI Apps", "Web Apps", "Ecommerce")
- Background `{colors.canvas-elevated}`, text `{colors.ink}`, type `{typography.button-md}`, rounded `{rounded.pill-category}` (64px), padding `0px 16px`.

**`button-icon-circular`** — circular icon / carousel control
- Background `{colors.canvas-elevated}`, text `{colors.ink}`, 1px hairline `{colors.hairline}`, type `{typography.body-lg}`, rounded `{rounded.full}`, no padding.

### Inputs & Forms

**`text-input`** — default form field
- Background `{colors.canvas-elevated}`, ink text `{colors.ink}`, 1px accessible `--input` boundary, type `{typography.body-md}` (16px on mobile), rounded `{rounded.sm}`, padding `{spacing.xs} {spacing.sm}`. Primary single-line controls target a minimum height of 44px; textareas may grow as needed.

### Cards & Containers

**`feature-card`** — flat hairline content card
- Background `{colors.canvas-elevated}`, 1px hairline `{colors.hairline}`, ink text `{colors.ink}`, type `{typography.body-md}`, rounded `{rounded.md}`, padding `{spacing.lg}`. The workhorse grid tile, often holding a node-graph or code illustration.

**`feature-card-elevated`** — lifted card variant
- Same chrome as `feature-card` with the Level-2 floating shadow for menus / featured tiles.

**`pricing-card`** — pricing tier card
- Background `{colors.canvas-elevated}`, 1px hairline `{colors.hairline}`, ink text `{colors.ink}`, type `{typography.body-md}`, rounded `{rounded.lg}`, padding `{spacing.xl}`.

Shared card density follows those roles: standard cards use `{rounded.md}` (12px) and `{spacing.lg}` (24px); large cards use `{rounded.lg}` (16px) and `{spacing.xl}` (32px). Dense cards use a 12px radius and 12px padding for compact summaries such as recent-run lists. Card headings use the `{typography.display-md}` role (20px/600/28px/-0.4px); dense card headings use the body-sm size (12px/16px) with label weight 500. All card wrappers share the canonical Card surface and density definitions rather than duplicating them. Choose the heading level to fit the surrounding page outline.

**`code-block`** — code / terminal surface
- Background `{colors.canvas-elevated}`, ink text `{colors.ink}`, 1px hairline `{colors.hairline}`, monospace `{typography.code}`, rounded `{rounded.md}`, padding `{spacing.md}`. Syntax rendered in the ink-and-accent palette.

### Application Shell and Navigation

- Sidebar: use `--sidebar` and related semantic tokens. Expanded width 256px, collapsed width 72px; these are shared layout dimensions, not feature-level values. Use 6px item radius, 14px labels, semantic active/hover states and visible focus. Primary navigation targets 44px height. Collapsed items retain accessible names and tooltips when needed.
- Header: 64px nominal height, neutral canvas, bottom hairline and the sticky layer. Use canonical gutters; allow actions to wrap or move into the shared overflow menu. Main content offsets track the sidebar width without independent numeric copies.
- Page header: 24px page title with the page-title role; dense headers may use display-md. Descriptions use readable muted body-md. Status and primary/secondary actions remain aligned and wrap on small screens.
- Tabs: use shared Base UI tabs and semantic active indicators, not color alone. Use body-md or label-sm; provide keyboard navigation and horizontal scrolling or wrapping where appropriate. Marketing category pills remain a separate shape variant.

### Dialogs, Drawers and Floating Surfaces

| Component | Specification |
| --- | --- |
| Dialog | Common backdrop, popover surface, 16px radius, 24px padding, Level-2 shadow, readable title and description; constrain size to viewport. |
| Alert dialog | Same visual foundation; preserve Base UI alert-dialog semantics, safe initial focus and clearly labeled destructive actions. |
| Drawer / sheet | Edge-attached surface, nominal 288px width constrained by viewport, common backdrop and elevation; preserve scroll and focus behavior. |
| Popover | Popover surface, hairline, 12px radius, 12px padding and Level-2 shadow. |
| Dropdown menu | Same floating surface, 4px outer padding, 6px item radius, keyboard and pointer states. |
| Tooltip | High-contrast foreground/background inversion, compact body-sm, appropriate delay and short descriptive text. Arrow geometry may follow the library. Never place essential interactive content exclusively in a tooltip. |

Use Base UI primitives and preserve focus trapping for modal content, focus restoration, Escape handling, accessible names and nested portal stacking. Avoid clipping lengthy or translated content.

### Tables and Data Density

Use shared read-only and advanced table components, with TanStack Table where complex table behavior is needed. Use body-md for normal cells and label weight for headers. Comfortable cell padding is 8px; compact cell padding is 4px, with sufficient height for the actual text and controls. Use decorative row dividers, neutral hover/selection surfaces and tabular numerals for comparable metrics. Do not shrink essential text or hit targets to force density. Use contained horizontal scrolling for genuinely two-dimensional data rather than allowing the entire page to overflow. Preserve accessible table semantics, sorting state, loading, empty and error states.

### Forms and Controls

Reuse the shared Button, Input, Textarea, NativeSelect, Combobox, Checkbox, Switch, DatePicker, Field and form-field primitives. Use canonical `form-control` styling where compatible, with 6px radius, 12px horizontal and 8px vertical padding, accessible boundary, consistent typography and focus/validation states. Label text uses label-sm; help and error text use readable body-sm or body-md as appropriate. Associate errors and labels programmatically. Retain distinct geometry for checkboxes, switches, calendar cells and multiline controls. Buttons with loading states retain accessible names and prevent duplicate actions. Standard icon buttons use 44px targets; default icon artwork is 16px, with 12px, 20px and 24px roles available when appropriate.

### Status, Badges and Feedback

Use the shared badge and run-status primitives. Default status chips have a 6px radius, compact body-sm label with weight 500, 4px vertical and 8px horizontal padding, and readable semantic text. Use neutral surfaces for queued/cancelled states; blue for running/information and success, amber for warnings, and red for failures. Distinguish states through explicit text and icons rather than color alone. Domain-specific state mappings may differ, but visual variants are shared.

Use existing shared empty, error, loading, skeleton, query-boundary, file-upload and disabled-reason components. Toasts use the popover palette, shared radius/elevation and toast layer. Keep the existing bottom-center notification placement unless a documented UX need requires otherwise. Announce relevant messages accessibly without interrupting the user for routine feedback.

### Charts and Metrics

Use the existing shared chart and metric primitives. Charts use the five canonical chart tokens in the Data Visualization Palette; a caller selects a permitted token, not a raw color. Chart frames use the standard Card, with a nominal 260px plot height where appropriate, responsive width, theme-aware axes/grid/legend/tooltip and accessible tabular fallback. Use a shared chart configuration for line width, area opacity, grid opacity and other reusable styling. Runtime data geometry remains in the chart library. The shared Recharts adapter disables nonessential chart animation by default; callers may pass a canonical token name or `var(--token)`; unknown values use the five-color categorical palette. Numeric metric values remain easy to compare and are accompanied by text labels; trend indicators use Lucide icons and explicit values.

### AI, Agent and RAG Workspaces

- AI conversation: neutral canvas and card/muted message surfaces, readable body typography, canonical code blocks and links, shared input and submit controls, clear loading/streaming status and stop actions. Preserve text selection, safe Markdown rendering and usable scrolling on narrow screens.
- Agent workspace: canonical cards, configuration forms, metric tiles, history tables and run-status badges. Trace steps use neutral inset surfaces and semantic status indicators; include readable status labels and accessible details.
- RAG workspace: reuse shared panels, forms, upload controls, tables and metrics for document ingestion, indexing, retrieval, evaluation and run history. Present sources/citations with readable link tokens, accessible titles and source context. Chunk previews and retrieval results use standard cards or inset muted surfaces. Use responsive split layouts that stack when available width is insufficient.
- Generated UI: the renderer may compose only approved component types, semantic variants and validated actions. It must not accept arbitrary CSS, class names, inline visual styles, external stylesheets, executable code or unsanitized HTML. Keep generated content within the same design system and accessibility rules.

### Calendar

Preserve the existing FullCalendar rendering and event interaction model. Use canonical semantic tokens for grid surfaces, boundaries, text, selection, event state, popovers and toolbar controls. Compact date cells and circular date/event markers are permitted as described under Calendar Interaction Exceptions. Event colors may represent actual categories or validated dynamic event data, not a competing static palette; include labels and ensure text contrast. Preserve keyboard interaction, drag/resize behavior, narrow-screen reflow and print output. Date-picker and calendar cell geometry may differ from primary form controls when accessibility requirements are met.

### Authentication and Settings

Use existing auth shell and form primitives, card surfaces, canonical radius and spacing, and wide/readable container roles. Optional marketing content may use display typography, but no competing theme. Settings and admin screens use the same page shell, section cards, form grids, tables, dialogs and feedback patterns as the rest of the application. Preserve long-label and translated-content wrapping.

### Bands

**`logo-strip`** — customer logo band
- Background `{colors.canvas}`, readable muted text `--content-muted`, type `{typography.body-md}`, padding `{spacing.xl} {spacing.lg}`. A greyscale row of customer wordmarks.

**`hero-band`** — full-width hero section
- Background `{colors.canvas}` with the mesh gradient, ink text `{colors.ink}`, display type `{typography.display-xl}`, padding `{spacing.section} {spacing.lg}`.

**`cta-band`** — end-of-page call-to-action band ("Start Deploying")
- Background `{colors.canvas}`, ink text `{colors.ink}`, display type `{typography.display-xl}`, padding `{spacing.4xl} {spacing.lg}`, with a `{components.button-primary}` pill.

### Footer

**`footer`** — site footer
- Background `{colors.canvas}`, top hairline `{colors.hairline}`, theme-aware body text `{colors.body}`, type `{typography.body-md}`, padding `{spacing.3xl} {spacing.lg}`. Multi-column link groups under the wordmark.

## Accessibility and Validation

- Target WCAG 2.2 AA in light and dark modes. Verify text and non-text contrast for actual rendered surfaces; do not assume a brand palette automatically passes.
- Preserve keyboard access, visible and unobscured focus, accessible names, semantic headings, labels, validation messages, screen-reader status feedback and dialog focus behavior.
- Ensure usable reflow at 320 CSS px, support text enlargement, and test content with long English, Dutch and French labels. Data tables and other inherently two-dimensional content may scroll within their own region.
- Validate touch targets and reduced-motion preferences, including third-party charts and calendar interactions.
- Storybook imports the same `index.css` and uses the same theme application mechanism. Cover foundations, shared controls, layout, overlays, feedback, data components and representative workspaces in both themes and responsive sizes.
- Run the existing design checker, lint, type checking, focused component tests, production build and relevant Storybook/browser accessibility checks for design changes. Add targeted visual regression coverage for high-risk surfaces. Automated accessibility checks are not a substitute for manual keyboard, contrast and assistive-technology checks.
- The design checker should enforce the stylesheet boundary, prohibited imports, token ownership and documented exceptions, including Storybook. Make the relevant check a required CI gate; do not weaken it to pass a migration.

### Approved Implementation Exceptions

| Exception | Scope and condition |
| --- | --- |
| Tailwind, Fontsource and FullCalendar skeleton CSS | Essential dependency imports only; do not add competing application stylesheets. |
| FullCalendar continuation marker and event positioning | Required SVG geometry, runtime coordinates, drag/resize handles and event colors; not a general icon exception. |
| Recharts | Library-rendered SVG and runtime chart geometry; static palettes and reusable styling still come from `index.css`. |
| QR code | Bitmap encoding colors required for scan reliability; not application palette values. |
| Base UI and native controls | Library-required native render targets, tooltip arrow geometry and accessible native select/textarea elements. |
| Runtime branding | Validated server-provided values limited to documented branding slots; preserve contrast and theme behavior. |
| User-authored content | Meaningful formatting and safely rendered content; never allow arbitrary executable or styling instructions. |

Keep exceptions narrow and review them when the affected implementation changes. Do not exempt an entire feature because one element requires custom geometry.

## Do's and Don'ts

### Do
- Use the canonical neutral canvas, ink and hairline ladder in both themes. Let content hierarchy and spacing do the work.
- Confine decorative color to the optional hero mesh and small illustration accents; use semantic colors for links, focus, meaningful states and data visualization.
- Use the two button shapes by context: marketing pills and 6px application controls, with documented icon and category exceptions.
- Define cards with a 1px hairline before adding shadow; give essential control boundaries sufficient contrast.
- Set display headings in Inter or the platform UI fallback at weight 600 with tight negative tracking; label technical sections with uppercase IBM Plex Mono eyebrows.
- Use readable muted content tokens for essential secondary text; reserve faint tones for eligible decorative or inactive elements.
- Reuse shared shadcn/Base UI components, named Lucide icons and CSS-owned design tokens. Keep layout composition close to components.

### Don't
- Don't fill large application surfaces with decorative accent colors or introduce a second gradient language.
- Don't mix marketing and application button shapes arbitrarily, pile on heavy shadows or loosen the defined display tracking.
- Don't hardcode black/white text or surfaces across themes; use the semantic foreground and background roles.
- Don't use MUI, Emotion, competing UI frameworks, independent static palettes or additional application-authored stylesheets.
- Don't use low-contrast decorative colors for essential text, status or control boundaries. Don't rely on color alone.
- Don't duplicate reusable static design decisions in feature files, create unnecessary wrappers or move every structural Tailwind utility into CSS.
- Don't compromise accessibility, responsive behavior or existing library interactions to achieve visual uniformity.
