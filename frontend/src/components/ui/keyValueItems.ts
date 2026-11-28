import { helpTermIdForKey } from "../../lib/helpText";
import type { KeyValueItem } from "./KeyValueList";

function formatPrimitive(value: unknown): string {
    if (value == null) return "—";
    if (typeof value === "number") {
        return Number.isFinite(value)
            ? Number.isInteger(value)
                ? String(value)
                : value.toFixed(4).replace(/\.?0+$/, "")
            : String(value);
    }
    if (typeof value === "boolean") return value ? "true" : "false";
    return String(value);
}

/** Flatten a shallow metrics object into KeyValueItems (skips nested objects/arrays). */
export function keyValueItemsFromRecord(
    record: Record<string, unknown> | null | undefined,
    options?: { maxItems?: number }
): KeyValueItem[] {
    if (!record) return [];
    const maxItems = options?.maxItems ?? 40;
    const items: KeyValueItem[] = [];
    for (const [key, value] of Object.entries(record)) {
        if (items.length >= maxItems) break;
        if (value != null && typeof value === "object") continue;
        items.push({
            key,
            label: key.replace(/_/g, " "),
            value: formatPrimitive(value),
            helpTermId: helpTermIdForKey(key) ?? undefined,
        });
    }
    return items;
}
