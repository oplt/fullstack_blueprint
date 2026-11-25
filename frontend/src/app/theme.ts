export const THEME_PREFERENCES_STORAGE_KEY = "fullstack-blueprint.theme";
export type ColorMode = "light" | "dark" | "system";
export type ThemePreferences = { colorMode: ColorMode };

const defaults: ThemePreferences = { colorMode: "system" };
const isMode = (value: unknown): value is ColorMode => value === "light" || value === "dark" || value === "system";

export function normalizeThemePreferences(value: unknown): ThemePreferences {
    const candidate = value && typeof value === "object" ? value as Record<string, unknown> : {};
    return { colorMode: isMode(candidate.colorMode) ? candidate.colorMode : defaults.colorMode };
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

export function applyTheme(resolvedMode: "light" | "dark", root: HTMLElement = document.documentElement): void {
    root.dataset.theme = resolvedMode;
    root.classList.toggle("dark", resolvedMode === "dark");
    root.style.colorScheme = resolvedMode;
}
