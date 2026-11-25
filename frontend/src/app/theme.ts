export const THEME_PREFERENCES_STORAGE_KEY = "fullstack-blueprint.theme";

export const themePresets = ["minimal-saas", "linear-inspired", "enterprise", "creative-ai"] as const;
export type ThemePreset = (typeof themePresets)[number];
export type ColorMode = "light" | "dark" | "system";
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

const defaults: ThemePreferences = {
    colorMode: "system",
    preset: "minimal-saas",
    radius: "md",
    density: "comfortable",
};

const isPreset = (value: unknown): value is ThemePreset => typeof value === "string" && themePresets.includes(value as ThemePreset);
const isMode = (value: unknown): value is ColorMode => value === "light" || value === "dark" || value === "system";
const isDensity = (value: unknown): value is Density => value === "compact" || value === "comfortable";
const isRadius = (value: unknown): value is RadiusScale => value === "none" || value === "sm" || value === "md" || value === "lg";
const isHex = (value: unknown): value is string => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);

export function normalizeThemePreferences(value: unknown): ThemePreferences {
    if (!value || typeof value !== "object") return { ...defaults };
    const candidate = value as Record<string, unknown>;
    return {
        colorMode: isMode(candidate.colorMode) ? candidate.colorMode : defaults.colorMode,
        preset: isPreset(candidate.preset) ? candidate.preset : defaults.preset,
        primaryColor: isHex(candidate.primaryColor) ? candidate.primaryColor : undefined,
        fontFamily: typeof candidate.fontFamily === "string" && candidate.fontFamily.trim() ? candidate.fontFamily.trim() : undefined,
        radius: isRadius(candidate.radius) ? candidate.radius : defaults.radius,
        density: isDensity(candidate.density) ? candidate.density : defaults.density,
    };
}

export function loadThemePreferences(storage?: Storage): ThemePreferences {
    if (!storage) return { ...defaults };
    try {
        const value = storage.getItem(THEME_PREFERENCES_STORAGE_KEY);
        return value ? normalizeThemePreferences(JSON.parse(value)) : { ...defaults };
    } catch {
        return { ...defaults };
    }
}

export function saveThemePreferences(preferences: ThemePreferences, storage?: Storage): void {
    try { storage?.setItem(THEME_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences)); } catch { /* optional storage */ }
}

export function applyTheme(preferences: ThemePreferences, resolvedMode: "light" | "dark", root: HTMLElement = document.documentElement): void {
    root.dataset.theme = resolvedMode;
    root.dataset.themePreset = preferences.preset;
    root.dataset.density = preferences.density;
    root.dataset.radius = preferences.radius;
    root.style.colorScheme = resolvedMode;
    root.style.removeProperty("--primary");
    root.style.removeProperty("--font-family-text");
    if (preferences.primaryColor) root.style.setProperty("--primary", preferences.primaryColor);
    if (preferences.fontFamily) root.style.setProperty("--font-family-text", preferences.fontFamily);
}
