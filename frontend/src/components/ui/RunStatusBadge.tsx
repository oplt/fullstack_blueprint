import { cn } from "@/lib/utils";
import { Badge } from "./badge";
import { runStatusAriaLabel } from "@/utils/a11y";
import { runStatusLabel, runStatusTone } from "./runStatusModel";

type RunStatusBadgeProps = { status: string | null | undefined; size?: "sm" | "default"; showRaw?: boolean };
const STATUS_VARIANTS = { error: "destructive", success: "success", warning: "warning", info: "information", neutral: "outline", default: "outline" } as const;

export function RunStatusBadge({ status, size = "sm", showRaw = false }: RunStatusBadgeProps) {
    const label = runStatusLabel(status);
    const raw = status?.trim() ?? "";
    const display = showRaw && raw && raw.toLowerCase() !== label.toLowerCase() ? `${label} (${raw})` : label;
    const variant = STATUS_VARIANTS[runStatusTone(status)];
    return <Badge aria-label={runStatusAriaLabel(display)} variant={variant} className={cn(size === "default" && "px-2.5 py-1 text-sm")}>{display}</Badge>;
}
