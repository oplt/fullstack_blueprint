import { cn } from "@/lib/utils";
import { runStatusAriaLabel } from "../../app/a11y";
import { runStatusLabel, runStatusTone } from "./runStatusModel";
type RunStatusChipProps = { status: string | null | undefined; size?: "small" | "medium"; showRaw?: boolean };
export function RunStatusChip({ status, size = "small", showRaw = false }: RunStatusChipProps) {
    const label = runStatusLabel(status);
    const raw = status?.trim() ?? "";
    const display = showRaw && raw && raw.toLowerCase() !== label.toLowerCase() ? label + " (" + raw + ")" : label;
    const tone = runStatusTone(status);
    return <span aria-label={runStatusAriaLabel(display)} className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", size === "medium" && "px-2.5 py-1 text-sm", tone === "success" && "border-success/40 bg-success/10 text-success", tone === "error" && "border-destructive/40 bg-destructive/10 text-destructive", tone === "warning" && "border-warning/40 bg-warning/10 text-warning", tone === "info" && "border-information/40 bg-information/10 text-information", tone === "default" && "border-border text-muted-foreground")}>{display}</span>;
}
