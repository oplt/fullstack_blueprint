/**
 * Canonical, framework-independent design tokens.
 *
 * Components should consume semantic tokens (or the CSS custom properties they
 * produce) instead of choosing product-specific colors and spacing values.
 * The shape is serialisable so the same values can be consumed by Tailwind,
 * shadcn primitives and framework-independent utilities.
 */

export const THEME_PREFERENCES_STORAGE_KEY = "fullstack-blueprint.theme";

export const themePresets = [
    "minimal-saas",
    "linear-inspired",
    "enterprise",
    "creative-ai",
] as const;

export type ThemePreset = (typeof themePresets)[number];
export type ColorMode = "light" | "dark" | "system";
export type ThemeResolvedMode = "light" | "dark";
export type Density = "compact" | "comfortable";
export type RadiusScale = "none" | "sm" | "md" | "lg";

export type ThemePreferences = {
    colorMode: ColorMode;
    preset: ThemePreset;
    primaryColor?: string;
    fontFamily?: string;
    radius: RadiusScale;
    density: Density;
};

type SemanticColors = {
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
    primary: string;
    primaryForeground: string;
    primaryHover: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    destructive: string;
    destructiveForeground: string;
    success: string;
    successForeground: string;
    warning: string;
    warningForeground: string;
    information: string;
    informationForeground: string;
    border: string;
    input: string;
    ring: string;
    sidebar: string;
    sidebarForeground: string;
    surfaceSoft: string;
    surfaceCard: string;
    surfaceCreamStrong: string;
    surfaceDark: string;
    surfaceDarkElevated: string;
    surfaceDarkSoft: string;
    hairline: string;
    hairlineSoft: string;
    ink: string;
    bodyStrong: string;
    body: string;
    mutedSoft: string;
    onDark: string;
    onDarkSoft: string;
    accentTeal: string;
    accentAmber: string;
    chart: readonly [string, string, string, string, string];
};

type TypographyTokens = {
    display: string;
    text: string;
    mono: string;
    bodySize: string;
    bodyLineHeight: string;
    headingWeight: number;
    bodyWeight: number;
    labelWeight: number;
};

export type DesignTokens = {
    preset: ThemePreset;
    mode: ThemeResolvedMode;
    colors: SemanticColors;
    typography: TypographyTokens;
    fontWeights: {
        regular: number;
        medium: number;
        semibold: number;
        bold: number;
    };
    spacing: {
        xxs: string;
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
        xxl: string;
        section: string;
    };
    radius: {
        none: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
        pill: string;
        active: string;
    };
    elevation: {
        flat: string;
        raised: string;
        overlay: string;
        focus: string;
    };
    motion: {
        durationFast: string;
        durationNormal: string;
        durationSlow: string;
        easingStandard: string;
    };
    density: {
        name: Density;
        controlHeight: string;
        pagePadding: string;
        controlPaddingX: string;
        sectionGap: string;
    };
    breakpoints: {
        mobile: string;
        mobileLg: string;
        tablet: string;
        desktop: string;
        desktopXl: string;
    };
};

type PresetDefinition = {
    primary: string;
    primaryHover: string;
    lightAccent: string;
    darkAccent: string;
    chart: readonly [string, string, string, string, string];
};

const presetDefinitions: Record<ThemePreset, PresetDefinition> = {
    "minimal-saas": {
        primary: "#CC785C",
        primaryHover: "#A9583E",
        lightAccent: "#F3DDD2",
        darkAccent: "#5A2F25",
        chart: ["#CC785C", "#5DB8A6", "#E8A55A", "#5DB872", "#6C6A64"],
    },
    "linear-inspired": {
        primary: "#5E6AD2",
        primaryHover: "#4F5BC5",
        lightAccent: "#E0E7FF",
        darkAccent: "#2E3475",
        chart: ["#5E6AD2", "#0F766E", "#D97706", "#DB2777", "#0891B2"],
    },
    enterprise: {
        primary: "#0F766E",
        primaryHover: "#115E59",
        lightAccent: "#CCFBF1",
        darkAccent: "#134E4A",
        chart: ["#0F766E", "#2563EB", "#B45309", "#BE185D", "#6D28D9"],
    },
    "creative-ai": {
        primary: "#7C3AED",
        primaryHover: "#6D28D9",
        lightAccent: "#EDE9FE",
        darkAccent: "#4C1D95",
        chart: ["#7C3AED", "#DB2777", "#0891B2", "#D97706", "#16A34A"],
    },
};

const radiusValues: Record<RadiusScale, string> = {
    none: "0px",
    sm: "6px",
    md: "8px",
    lg: "12px",
};

const defaultPreferences: ThemePreferences = {
    colorMode: "light",
    preset: "minimal-saas",
    radius: "md",
    density: "comfortable",
};

const fonts = {
    display: "\"Cormorant Garamond\", \"EB Garamond\", Georgia, \"Times New Roman\", serif",
    text: "Inter, Manrope, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
    mono: "\"JetBrains Mono\", \"IBM Plex Mono\", ui-monospace, SFMono-Regular, Menlo, monospace",
} as const;

const motion = {
    durationMs: 220,
    easing: "cubic-bezier(0.2, 0, 0, 1)",
} as const;

export const radii = {
    button: 8,
    card: 12,
    none: 0,
} as const;

/** Stable aliases retained for product configuration and legacy token consumers. */
export const colors = {
    coral: presetDefinitions["minimal-saas"].primary,
    coralActive: presetDefinitions["minimal-saas"].primaryHover,
    electricBlue: presetDefinitions["minimal-saas"].primary,
    white: "#FFFFFF",
    lightAsh: "#FAF9F5",
    carbonDark: "#181715",
    graphite: "#252523",
    pewter: "#6C6A64",
    silverFog: "#8E8B82",
    cloudGray: "#F5F0E8",
    paleSilver: "#E6DFD8",
    frostedGlass: "rgba(250, 249, 245, 0.84)",
    overlay: "rgba(20, 20, 19, 0.65)",
    border: "#E6DFD8",
    bg: "#FAF9F5",
    text: "#141413",
} as const;

function isThemePreset(value: unknown): value is ThemePreset {
    return typeof value === "string" && themePresets.includes(value as ThemePreset);
}

function isColorMode(value: unknown): value is ColorMode {
    return value === "light" || value === "dark" || value === "system";
}

function isDensity(value: unknown): value is Density {
    return value === "compact" || value === "comfortable";
}

function isRadiusScale(value: unknown): value is RadiusScale {
    return value === "none" || value === "sm" || value === "md" || value === "lg";
}

function isHexColor(value: unknown): value is string {
    return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

export function normalizeThemePreferences(value: unknown): ThemePreferences {
    if (!value || typeof value !== "object") {
        return { ...defaultPreferences };
    }

    const candidate = value as Record<string, unknown>;
    return {
        colorMode: isColorMode(candidate.colorMode)
            ? candidate.colorMode
            : defaultPreferences.colorMode,
        preset: isThemePreset(candidate.preset) ? candidate.preset : defaultPreferences.preset,
        primaryColor: isHexColor(candidate.primaryColor) ? candidate.primaryColor : undefined,
        fontFamily:
            typeof candidate.fontFamily === "string" && candidate.fontFamily.trim().length > 0
                ? candidate.fontFamily
                : undefined,
        radius: isRadiusScale(candidate.radius) ? candidate.radius : defaultPreferences.radius,
        density: isDensity(candidate.density) ? candidate.density : defaultPreferences.density,
    };
}

export function loadThemePreferences(storage?: Storage): ThemePreferences {
    if (!storage) {
        return { ...defaultPreferences };
    }

    try {
        const stored = storage.getItem(THEME_PREFERENCES_STORAGE_KEY);
        return stored ? normalizeThemePreferences(JSON.parse(stored)) : { ...defaultPreferences };
    } catch {
        return { ...defaultPreferences };
    }
}

export function saveThemePreferences(preferences: ThemePreferences, storage?: Storage): void {
    if (!storage) {
        return;
    }

    try {
        storage.setItem(THEME_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
    } catch {
        // Storage can be unavailable in private browsing or a locked-down iframe.
    }
}

export function createDesignTokens(options: {
    preset?: ThemePreset;
    mode?: ThemeResolvedMode;
    primaryColor?: string;
    fontFamily?: string;
    radius?: RadiusScale;
    density?: Density;
} = {}): DesignTokens {
    const preset = options.preset ?? defaultPreferences.preset;
    const mode = options.mode ?? "light";
    const definition = presetDefinitions[preset];
    const primary = isHexColor(options.primaryColor) ? options.primaryColor : definition.primary;
    const isDark = mode === "dark";
    const foreground = isDark ? "#FAF9F5" : "#141413";
    const background = isDark ? "#181715" : "#FAF9F5";
    const card = isDark ? "#252320" : "#EFE9DE";
    const muted = isDark ? "#1F1E1B" : "#F5F0E8";
    const border = isDark ? "#3D3B37" : "#E6DFD8";
    const mutedForeground = isDark ? "#A09D96" : "#6C6A64";
    const surfaceCreamStrong = isDark ? "#302E29" : "#E8E0D2";
    const radius = options.radius ?? defaultPreferences.radius;
    const density = options.density ?? defaultPreferences.density;
    const customFontFamily = options.fontFamily?.trim();

    return {
        preset,
        mode,
        colors: {
            background,
            foreground,
            card,
            cardForeground: foreground,
            popover: card,
            popoverForeground: foreground,
            primary,
            primaryForeground: "#FFFFFF",
            primaryHover: isDark
                ? definition.primaryHover
                : isHexColor(options.primaryColor)
                  ? primary
                  : definition.primaryHover,
            secondary: surfaceCreamStrong,
            secondaryForeground: foreground,
            muted,
            mutedForeground,
            accent: isDark ? definition.darkAccent : definition.lightAccent,
            accentForeground: foreground,
            destructive: isDark ? "#F47F72" : "#C64545",
            destructiveForeground: "#FFFFFF",
            success: isDark ? "#7DD68A" : "#5DB872",
            successForeground: isDark ? "#142B18" : "#FFFFFF",
            warning: isDark ? "#F0BF69" : "#D4A017",
            warningForeground: isDark ? "#38270E" : "#FFFFFF",
            information: isDark ? "#8CCFC1" : "#397F73",
            informationForeground: isDark ? "#142B27" : "#FFFFFF",
            border,
            input: border,
            ring: primary,
            sidebar: isDark ? "#1F1E1B" : "#F5F0E8",
            sidebarForeground: foreground,
            surfaceSoft: muted,
            surfaceCard: card,
            surfaceCreamStrong,
            surfaceDark: "#181715",
            surfaceDarkElevated: "#252320",
            surfaceDarkSoft: "#1F1E1B",
            hairline: border,
            hairlineSoft: isDark ? "#302E29" : "#EBE6DF",
            ink: isDark ? "#FAF9F5" : "#141413",
            bodyStrong: isDark ? "#F0EDE5" : "#252523",
            body: isDark ? "#D8D4CC" : "#3D3D3A",
            mutedSoft: isDark ? "#77736C" : "#8E8B82",
            onDark: "#FAF9F5",
            onDarkSoft: "#A09D96",
            accentTeal: "#5DB8A6",
            accentAmber: "#E8A55A",
            chart: definition.chart,
        },
        typography: {
            display: customFontFamily || fonts.display,
            text: customFontFamily || fonts.text,
            mono: fonts.mono,
            bodySize: "1rem",
            bodyLineHeight: "1.55",
            headingWeight: 400,
            bodyWeight: 400,
            labelWeight: 500,
        },
        fontWeights: {
            regular: 400,
            medium: 500,
            semibold: 600,
            bold: 700,
        },
        spacing: {
            xxs: "4px",
            xs: "8px",
            sm: "12px",
            md: "16px",
            lg: "24px",
            xl: "32px",
            xxl: "48px",
            section: "96px",
        },
        radius: {
            none: "0px",
            sm: "6px",
            md: "8px",
            lg: "12px",
            xl: "16px",
            pill: "9999px",
            active: radiusValues[radius],
        },
        elevation: {
            flat: "none",
            raised: isDark ? "0 4px 16px rgba(2, 6, 23, 0.28)" : "0 4px 16px rgba(15, 23, 42, 0.08)",
            overlay: isDark ? "0 16px 48px rgba(2, 6, 23, 0.48)" : "0 16px 48px rgba(15, 23, 42, 0.16)",
            focus: `0 0 0 3px ${primary}44`,
        },
        motion: {
            durationFast: "120ms",
            durationNormal: `${motion.durationMs}ms`,
            durationSlow: "360ms",
            easingStandard: motion.easing,
        },
        density: {
            name: density,
            controlHeight: density === "compact" ? "36px" : "40px",
            pagePadding: density === "compact" ? "16px" : "24px",
            controlPaddingX: density === "compact" ? "12px" : "16px",
            sectionGap: density === "compact" ? "16px" : "24px",
        },
        breakpoints: {
            mobile: "480px",
            mobileLg: "768px",
            tablet: "1024px",
            desktop: "1280px",
            desktopXl: "1440px",
        },
    };
}

export function cssVariablesFor(tokens: DesignTokens): Record<string, string> {
    const variables: Record<string, string> = {
        "--background": tokens.colors.background,
        "--foreground": tokens.colors.foreground,
        "--card": tokens.colors.card,
        "--card-foreground": tokens.colors.cardForeground,
        "--popover": tokens.colors.popover,
        "--popover-foreground": tokens.colors.popoverForeground,
        "--primary": tokens.colors.primary,
        "--primary-foreground": tokens.colors.primaryForeground,
        "--secondary": tokens.colors.secondary,
        "--secondary-foreground": tokens.colors.secondaryForeground,
        "--muted": tokens.colors.muted,
        "--muted-foreground": tokens.colors.mutedForeground,
        "--accent": tokens.colors.accent,
        "--accent-foreground": tokens.colors.accentForeground,
        "--destructive": tokens.colors.destructive,
        "--destructive-foreground": tokens.colors.destructiveForeground,
        "--success": tokens.colors.success,
        "--success-foreground": tokens.colors.successForeground,
        "--warning": tokens.colors.warning,
        "--warning-foreground": tokens.colors.warningForeground,
        "--information": tokens.colors.information,
        "--information-foreground": tokens.colors.informationForeground,
        "--border": tokens.colors.border,
        "--input": tokens.colors.input,
        "--ring": tokens.colors.ring,
        "--sidebar": tokens.colors.sidebar,
        "--sidebar-foreground": tokens.colors.sidebarForeground,
        "--surface-soft": tokens.colors.surfaceSoft,
        "--surface-card": tokens.colors.surfaceCard,
        "--surface-cream-strong": tokens.colors.surfaceCreamStrong,
        "--surface-dark": tokens.colors.surfaceDark,
        "--surface-dark-elevated": tokens.colors.surfaceDarkElevated,
        "--surface-dark-soft": tokens.colors.surfaceDarkSoft,
        "--hairline": tokens.colors.hairline,
        "--hairline-soft": tokens.colors.hairlineSoft,
        "--ink": tokens.colors.ink,
        "--body-strong": tokens.colors.bodyStrong,
        "--body": tokens.colors.body,
        "--muted-soft": tokens.colors.mutedSoft,
        "--on-dark": tokens.colors.onDark,
        "--on-dark-soft": tokens.colors.onDarkSoft,
        "--accent-teal": tokens.colors.accentTeal,
        "--accent-amber": tokens.colors.accentAmber,
        "--sidebar-primary": tokens.colors.primary,
        "--sidebar-primary-foreground": tokens.colors.primaryForeground,
        "--sidebar-accent": tokens.colors.accent,
        "--sidebar-accent-foreground": tokens.colors.accentForeground,
        "--sidebar-border": tokens.colors.border,
        "--sidebar-ring": tokens.colors.ring,
        "--font-family-display": tokens.typography.display,
        "--font-family-text": tokens.typography.text,
        "--font-family-mono": tokens.typography.mono,
        "--font-size-body": tokens.typography.bodySize,
        "--line-height-body": tokens.typography.bodyLineHeight,
        "--font-weight-heading": String(tokens.typography.headingWeight),
        "--font-weight-body": String(tokens.typography.bodyWeight),
        "--font-weight-label": String(tokens.typography.labelWeight),
        "--radius": tokens.radius.active,
        "--radius-sm": tokens.radius.sm,
        "--radius-md": tokens.radius.md,
        "--radius-lg": tokens.radius.lg,
        "--radius-xl": tokens.radius.xl,
        "--radius-pill": tokens.radius.pill,
        "--spacing-page": tokens.density.pagePadding,
        "--space-xxs": tokens.spacing.xxs,
        "--space-xs": tokens.spacing.xs,
        "--space-sm": tokens.spacing.sm,
        "--space-md": tokens.spacing.md,
        "--space-lg": tokens.spacing.lg,
        "--space-xl": tokens.spacing.xl,
        "--space-xxl": tokens.spacing.xxl,
        "--section-rhythm": tokens.spacing.section,
        "--spacing-section-gap": tokens.density.sectionGap,
        "--control-height": tokens.density.controlHeight,
        "--control-padding-x": tokens.density.controlPaddingX,
        "--shadow-raised": tokens.elevation.raised,
        "--shadow-overlay": tokens.elevation.overlay,
        "--shadow-focus": tokens.elevation.focus,
        "--motion-fast": tokens.motion.durationFast,
        "--motion-normal": tokens.motion.durationNormal,
        "--motion-slow": tokens.motion.durationSlow,
        "--motion-easing": tokens.motion.easingStandard,
        "--breakpoint-mobile": tokens.breakpoints.mobile,
        "--breakpoint-mobile-lg": tokens.breakpoints.mobileLg,
        "--breakpoint-tablet": tokens.breakpoints.tablet,
        "--breakpoint-desktop": tokens.breakpoints.desktop,
        "--breakpoint-desktop-xl": tokens.breakpoints.desktopXl,
    };

    tokens.colors.chart.forEach((color, index) => {
        variables[`--color-chart-${index + 1}`] = color;
        variables[`--chart-${index + 1}`] = color;
    });
    return variables;
}

export function applyDesignTokens(
    tokens: DesignTokens,
    root: HTMLElement | null = typeof document === "undefined" ? null : document.documentElement,
): void {
    if (!root) {
        return;
    }

    for (const [name, value] of Object.entries(cssVariablesFor(tokens))) {
        root.style.setProperty(name, value);
    }
    root.style.colorScheme = tokens.mode;
    root.dataset.theme = tokens.mode;
    root.dataset.themePreset = tokens.preset;
    root.dataset.density = tokens.density.name;
}
