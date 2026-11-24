import { describe, expect, it } from "vitest";
import {
    THEME_PREFERENCES_STORAGE_KEY,
    applyDesignTokens,
    createDesignTokens,
    cssVariablesFor,
    loadThemePreferences,
    normalizeThemePreferences,
    saveThemePreferences,
    themePresets,
} from "./designTokens";
import { createDesignPalette } from "./designPalette";

describe("canonical design tokens", () => {
    it("provides every supported preset with semantic light and dark tokens", () => {
        for (const preset of themePresets) {
            const light = createDesignTokens({ preset, mode: "light" });
            const dark = createDesignTokens({ preset, mode: "dark" });

            expect(light.colors.primary).toBeTruthy();
            expect(light.colors.background).not.toBe(dark.colors.background);
            expect(light.colors.chart).toHaveLength(5);
            expect(light.typography.text).toContain("Manrope");
        }

        const defaultTokens = createDesignTokens();
        expect(defaultTokens.colors.background).toBe("#FAF9F5");
        expect(defaultTokens.colors.primary).toBe("#CC785C");
        expect(defaultTokens.typography.display).toContain("Cormorant Garamond");
        expect(defaultTokens.spacing.section).toBe("96px");
    });

    it("supports configurable primary color, typography, radius, and density", () => {
        const tokens = createDesignTokens({
            primaryColor: "#123456",
            fontFamily: "Test Sans, sans-serif",
            radius: "lg",
            density: "compact",
        });

        expect(tokens.colors.primary).toBe("#123456");
        expect(tokens.typography.text).toBe("Test Sans, sans-serif");
        expect(tokens.radius.active).toBe("12px");
        expect(tokens.density.controlHeight).toBe("36px");
    });

    it("projects semantic tokens into the CSS palette used by shared components", () => {
        const palette = createDesignPalette("dark");
        expect(palette.mode).toBe("dark");
        expect(palette.primary.main).toBe("#CC785C");
        expect(palette.background.paper).toBeTruthy();
    });

    it("serializes semantic tokens as CSS custom properties and applies them", () => {
        const root = document.createElement("html");
        const tokens = createDesignTokens({ preset: "linear-inspired", mode: "dark" });
        const variables = cssVariablesFor(tokens);

        applyDesignTokens(tokens, root);

        expect(variables["--primary"]).toBe(tokens.colors.primary);
        expect(root.style.getPropertyValue("--background")).toBe(tokens.colors.background);
        expect(root.style.colorScheme).toBe("dark");
        expect(root.dataset.theme).toBe("dark");
        expect(root.dataset.themePreset).toBe("linear-inspired");
        expect(root.dataset.density).toBe("comfortable");
    });
});

describe("theme preference persistence", () => {
    it("normalizes invalid persisted values to safe defaults", () => {
        const preferences = normalizeThemePreferences({
            colorMode: "invalid",
            preset: "unknown",
            primaryColor: "red",
            radius: "huge",
            density: "wide",
        });

        expect(preferences.colorMode).toBe("light");
        expect(preferences.preset).toBe("minimal-saas");
        expect(preferences.primaryColor).toBeUndefined();
        expect(preferences.radius).toBe("md");
        expect(preferences.density).toBe("comfortable");
    });

    it("round-trips preferences through storage", () => {
        const storage = new Map<string, string>();
        const adapter: Storage = {
            getItem: (key) => storage.get(key) ?? null,
            setItem: (key, value) => {
                storage.set(key, value);
            },
            removeItem: (key) => {
                storage.delete(key);
            },
            clear: () => storage.clear(),
            key: (index) => Array.from(storage.keys())[index] ?? null,
            get length() {
                return storage.size;
            },
        };
        const preferences = normalizeThemePreferences({
            colorMode: "system",
            preset: "creative-ai",
            primaryColor: "#123456",
            radius: "sm",
            density: "compact",
        });

        saveThemePreferences(preferences, adapter);
        expect(storage.has(THEME_PREFERENCES_STORAGE_KEY)).toBe(true);
        expect(loadThemePreferences(adapter)).toEqual(preferences);
    });
});
