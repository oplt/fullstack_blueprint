import { cn } from "@/lib/utils";
import { Badge } from "./badge";
import { runStatusAriaLabel } from "../../app/a11y";
import { runStatusLabel, runStatusTone } from "./runStatusModel";
type RunStatusChipProps = { status: string | null | undefined; size?: "small" | "medium"; showRaw?: boolean };
const STATUS_VARIANTS = { error: "destructive", success: "success", warning: "warning", info: "information", neutral: "outline", default: "outline" } as const;
export function RunStatusChip({ status, size = "small", showRaw = false }: RunStatusChipProps) {
    const label = runStatusLabel(status);
    const raw = status?.trim() ?? "";
    const display = showRaw && raw && raw.toLowerCase() !== label.toLowerCase() ? label + " (" + raw + ")" : label;
    const tone = runStatusTone(status);
    const variant = STATUS_VARIANTS[tone];
    return <Badge aria-label={runStatusAriaLabel(display)} variant={variant} className={cn(size === "medium" && "px-2.5 py-1 text-sm")}>{display}</Badge>;
}
