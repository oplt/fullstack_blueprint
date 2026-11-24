import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";
type SectionCardVariant = "default" | "subtle" | "outlined" | "flat";
type SectionCardProps = { title?: ReactNode; description?: ReactNode; action?: ReactNode; children: ReactNode; variant?: SectionCardVariant; compact?: boolean; sx?: CSSProperties; contentSx?: CSSProperties };
export function SectionCard({ title, description, action, children, variant = "default", compact = false, sx, contentSx }: SectionCardProps) {
    return <section className={cn("flex h-full min-h-0 flex-col rounded-xl", variant === "flat" ? "bg-transparent p-0" : compact ? "p-3" : "p-5", variant === "outlined" ? "border border-border bg-transparent" : variant === "subtle" ? "bg-muted/40" : variant === "flat" ? "" : "border border-border bg-card")} style={sx}>
        {(title || description || action) ? <div className={cn("flex shrink-0 justify-between gap-4", compact ? "mb-3" : "mb-4", "flex-col sm:flex-row sm:items-start")}><div className="min-w-0 flex-1">{title ? <h2 className={cn(compact ? "text-sm" : "text-base", "font-semibold")}>{title}</h2> : null}{description ? <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p> : null}</div>{action ? <div className="shrink-0">{action}</div> : null}</div> : null}
        <div className="min-h-0 flex-1" style={contentSx}>{children}</div>
    </section>;
}
