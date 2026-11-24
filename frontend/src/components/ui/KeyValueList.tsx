import { helpTermIdForKey } from "../../config/helpText";
import { HelpTooltip } from "./HelpTooltip";
import type { CSSProperties } from "react";
export type KeyValueItem = { key: string; label: React.ReactNode; value: React.ReactNode; description?: React.ReactNode; helpTermId?: string };
type KeyValueListProps = { items: KeyValueItem[]; dense?: boolean; emptyLabel?: string; showHelp?: boolean; sx?: CSSProperties };
export function KeyValueList({ items, dense = false, emptyLabel = "No metrics available.", showHelp = true, sx }: KeyValueListProps) {
    if (!items.length) return <p className="text-sm text-muted-foreground" style={sx}>{emptyLabel}</p>;
    return <dl className="m-0 grid grid-cols-1 gap-x-4 sm:grid-cols-[minmax(120px,40%)_minmax(0,1fr)]" style={{ rowGap: dense ? 6 : 10, ...sx }}>{items.map((item) => { const termId = item.helpTermId ?? (showHelp ? helpTermIdForKey(item.key) : null); return <div key={item.key} className="contents"><dt className="border-b border-border py-2 text-sm text-muted-foreground sm:pr-2">{termId ? <HelpTooltip termId={termId} variant="label">{item.label}</HelpTooltip> : item.label}</dt><dd className="m-0 min-w-0 border-b border-border py-2"><div className="break-words text-sm font-medium tabular-nums">{item.value}</div>{item.description ? <div className="text-xs text-muted-foreground">{item.description}</div> : null}</dd></div>; })}</dl>;
}
