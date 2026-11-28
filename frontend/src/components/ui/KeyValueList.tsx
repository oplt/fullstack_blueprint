import type { ReactNode } from "react";
import { helpTermIdForKey } from "../../lib/helpText";
import { cn } from "@/lib/utils";
import { HelpTooltip } from "./HelpTooltip";
export type KeyValueItem = { key: string; label: ReactNode; value: ReactNode; description?: ReactNode; helpTermId?: string };
type KeyValueListProps = { items: KeyValueItem[]; dense?: boolean; emptyLabel?: string; showHelp?: boolean; className?: string };
export function KeyValueList({ items, dense = false, emptyLabel = "No metrics available.", showHelp = true, className }: KeyValueListProps) {
    if (!items.length) return <p className={cn("ui-muted-copy", className)}>{emptyLabel}</p>;
    return <dl data-dense={dense} className={cn("ui-key-value-list", className)}>{items.map((item) => {
        const termId = item.helpTermId ?? (showHelp ? helpTermIdForKey(item.key) : null);
        return <div key={item.key} className="contents"><dt className="ui-key-value-label">{termId ? <HelpTooltip termId={termId} variant="label">{item.label}</HelpTooltip> : item.label}</dt><dd className="ui-key-value-content"><div className="ui-key-value-value">{item.value}</div>{item.description ? <div className="ui-muted-caption">{item.description}</div> : null}</dd></div>;
    })}</dl>;
}
