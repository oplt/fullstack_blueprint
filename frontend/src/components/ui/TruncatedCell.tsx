import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";
import { dataTableDefaults } from "./dataTableTokens";
type TruncatedCellProps = { children: string | number | null | undefined; maxChars?: number; emptyLabel?: string; variant?: string; component?: keyof HTMLElementTagNameMap };
export function TruncatedCell({ children, maxChars = dataTableDefaults.truncateChars, emptyLabel = "—", component: Component = "span" }: TruncatedCellProps) {
    if (children == null || children === "") return <Component className="text-sm text-muted-foreground">{emptyLabel}</Component>;
    const full = String(children);
    if (full.length <= maxChars) return <Component className="block max-w-full truncate text-sm">{full}</Component>;
    const preview = full.slice(0, Math.max(1, maxChars - 1)) + "…";
    return <Tooltip><TooltipTrigger render={<Component className="block max-w-full cursor-help truncate text-sm" />}>{preview}</TooltipTrigger><TooltipContent>{full}</TooltipContent></Tooltip>;
}
