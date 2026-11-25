import { describe, expect, it } from "vitest";
import { applyTheme, loadThemePreferences, normalizeThemePreferences, saveThemePreferences, THEME_PREFERENCES_STORAGE_KEY } from "./theme";

describe("runtime color mode", () => {
    it("normalizes untrusted preferences to system mode", () => {
        expect(normalizeThemePreferences({ colorMode: "invalid", preset: "enterprise", primaryColor: "red" })).toEqual({ colorMode: "system" });
    });

    it("applies only the canonical color mode", () => {
        const root = document.createElement("html");
        applyTheme("dark", root);
        expect(root.dataset.theme).toBe("dark");
        expect(root.classList.contains("dark")).toBe(true);
        expect(root.style.getPropertyValue("--primary")).toBe("");
        applyTheme("light", root);
        expect(root.classList.contains("dark")).toBe(false);
    });

    it("round-trips color mode through storage", () => {
        const values = new Map<string, string>();
        const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: () => undefined, clear: () => values.clear(), key: () => null, get length() { return values.size; } } satisfies Storage;
        saveThemePreferences({ colorMode: "dark" }, storage);
        expect(values.has(THEME_PREFERENCES_STORAGE_KEY)).toBe(true);
        expect(loadThemePreferences(storage)).toEqual({ colorMode: "dark" });
    });
});
