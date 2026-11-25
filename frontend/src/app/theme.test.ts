import { describe, expect, it } from "vitest";
import { applyTheme, loadThemePreferences, normalizeThemePreferences, saveThemePreferences, THEME_PREFERENCES_STORAGE_KEY } from "./theme";

describe("runtime theme controller", () => {
    it("normalizes untrusted preferences", () => {
        expect(normalizeThemePreferences({ colorMode: "invalid", preset: "unknown", primaryColor: "red", radius: "huge" })).toEqual({
            colorMode: "system", preset: "minimal-saas", radius: "md", density: "comfortable",
        });
    });

    it("applies attributes and only supported dynamic overrides", () => {
        const root = document.createElement("html");
        applyTheme({ colorMode: "dark", preset: "enterprise", density: "compact", radius: "lg", primaryColor: "#123456" }, "dark", root);
        expect(root.dataset).toMatchObject({ theme: "dark", themePreset: "enterprise", density: "compact", radius: "lg" });
        expect(root.style.getPropertyValue("--primary")).toBe("#123456");
        applyTheme({ colorMode: "light", preset: "minimal-saas", density: "comfortable", radius: "md" }, "light", root);
        expect(root.style.getPropertyValue("--primary")).toBe("");
    });

    it("round-trips validated preferences through storage", () => {
        const values = new Map<string, string>();
        const storage = {
            getItem: (key: string) => values.get(key) ?? null,
            setItem: (key: string, value: string) => { values.set(key, value); },
            removeItem: (key: string) => { values.delete(key); },
            clear: () => values.clear(),
            key: (index: number) => [...values.keys()][index] ?? null,
            get length() { return values.size; },
        } satisfies Storage;
        const preferences = normalizeThemePreferences({ colorMode: "system", preset: "creative-ai", density: "compact", radius: "sm" });
        saveThemePreferences(preferences, storage);
        expect(values.has(THEME_PREFERENCES_STORAGE_KEY)).toBe(true);
        expect(loadThemePreferences(storage)).toEqual(preferences);
    });
});
