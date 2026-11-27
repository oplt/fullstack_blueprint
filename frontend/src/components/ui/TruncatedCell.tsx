import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";
type TruncatedCellProps = { children: string | number | null | undefined; maxChars?: number; emptyLabel?: string; variant?: string; component?: keyof HTMLElementTagNameMap };
export function TruncatedCell({ children, maxChars = 48, emptyLabel = "—", component: Component = "span" }: TruncatedCellProps) {
    if (children == null || children === "") return <Component className="ui-muted-copy">{emptyLabel}</Component>;
    const full = String(children);
    if (full.length <= maxChars) return <Component className="ui-truncated-cell">{full}</Component>;
    const preview = full.slice(0, Math.max(1, maxChars - 1)) + "…";
    return <Tooltip><TooltipTrigger render={<Component className="ui-truncated-cell ui-truncated-cell-help" />}>{preview}</TooltipTrigger><TooltipContent>{full}</TooltipContent></Tooltip>;
}
