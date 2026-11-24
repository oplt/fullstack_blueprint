import { useMemo, useState, type ReactNode } from "react";

export type VirtualizedListProps<T> = { items: T[]; renderItem: (item: T, index: number) => ReactNode; itemKey?: (item: T, index: number) => string; estimatedItemHeight?: number; height?: number; overscan?: number; ariaLabel?: string };

/** Small dependency-free windowing primitive for long, mostly uniform lists. */
export function VirtualizedList<T>({ items, renderItem, itemKey, estimatedItemHeight = 120, height = 640, overscan = 4, ariaLabel = "Virtualized list" }: VirtualizedListProps<T>) {
    const [scrollTop, setScrollTop] = useState(0);
    const start = Math.max(0, Math.floor(scrollTop / estimatedItemHeight) - overscan);
    const end = Math.min(items.length, Math.ceil((scrollTop + height) / estimatedItemHeight) + overscan);
    const visible = useMemo(() => items.slice(start, end), [end, items, start]);
    if (!items.length) return null;
    return <div role="list" aria-label={ariaLabel} className="overflow-auto" style={{ height }} onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}>
        <div style={{ height: items.length * estimatedItemHeight, position: "relative" }}>
            <div className="space-y-4" style={{ position: "absolute", insetInline: 0, top: start * estimatedItemHeight }}>
                {visible.map((item, offset) => { const index = start + offset; return <div role="listitem" key={itemKey?.(item, index) ?? index} style={{ minHeight: estimatedItemHeight }}>{renderItem(item, index)}</div>; })}
            </div>
        </div>
    </div>;
}
