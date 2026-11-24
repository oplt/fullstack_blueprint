import type { CSSProperties } from "react";

/**
 * Shared compatibility type for the small number of public `sx` escape hatches
 * retained while feature pages migrate. New primitives should prefer `className`
 * and semantic Tailwind classes.
 */
export type StyleCompat = Record<string, unknown> | ((theme: any) => Record<string, unknown>) | Array<Record<string, unknown> | ((theme: any) => Record<string, unknown>)>;

const spacing = (value: unknown) => typeof value === "number" ? value * 8 : value;

function normalizeKeyValue(key: string, value: unknown): [string, unknown] {
    const aliases: Record<string, string> = { bgcolor: "backgroundColor", m: "margin", mt: "marginTop", mr: "marginRight", mb: "marginBottom", ml: "marginLeft", mx: "marginInline", my: "marginBlock", p: "padding", pt: "paddingTop", pr: "paddingRight", pb: "paddingBottom", pl: "paddingLeft", px: "paddingInline", py: "paddingBlock" };
    if (aliases[key]) return [aliases[key], spacing(value)];
    if (key === "border" && typeof value === "number") return [key, value + "px solid var(--border)"];
    if (key === "borderRadius" && typeof value === "number") return [key, value * 4];
    if (key === "color" && typeof value === "string") { const colors: Record<string, string> = { "text.primary": "var(--foreground)", "text.secondary": "var(--muted-foreground)", "primary.main": "var(--primary)", "background.paper": "var(--card)", "background.default": "var(--background)", divider: "var(--border)" }; return [key, colors[value] ?? value]; }
    if (key === "backgroundColor" && typeof value === "string") { const colors: Record<string, string> = { "background.paper": "var(--card)", "background.default": "var(--background)", divider: "var(--border)" }; return [key, colors[value] ?? value]; }
    return [key, value];
}

export function inlineStyle(value: StyleCompat | undefined): CSSProperties {
    if (!value) return {};
    if (typeof value === "function") {
        try {
            return inlineStyle(value(undefined));
        } catch {
            return {};
        }
    }
    if (Array.isArray(value)) return value.reduce<CSSProperties>((acc, item) => ({ ...acc, ...inlineStyle(item) }), {});
    if (typeof value !== "object") return {};
    const result: CSSProperties = {};
    for (const [key, raw] of Object.entries(value)) {
        if (raw == null || typeof raw === "function") continue;
        const responsive = typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>).xs : raw;
        if (responsive == null || typeof responsive === "object") continue;
        const [normalizedKey, normalizedValue] = normalizeKeyValue(key, responsive);
        (result as Record<string, unknown>)[normalizedKey] = normalizedValue;
    }
    return result;
}
