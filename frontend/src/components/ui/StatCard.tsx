import type { ReactNode } from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
type StatCardProps = { label: string; value: ReactNode; description?: ReactNode; icon: ReactNode; loading?: boolean; color?: "primary" | "secondary" | "success" | "warning" | "error" | "info" };
const iconTone = cva("grid size-10 place-items-center rounded-lg", {
    variants: {
        color: {
            primary: "bg-primary/10 text-primary",
            secondary: "bg-secondary text-secondary-foreground",
            success: "bg-success/10 text-success",
            warning: "bg-warning/10 text-warning",
            error: "bg-destructive/10 text-destructive",
            info: "bg-information/10 text-information",
        },
    },
    defaultVariants: { color: "primary" },
});

export function StatCard({ label, value, description, icon, loading = false, color = "primary" }: StatCardProps) {
    return (
        <section className="flex min-h-full flex-col rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className={cn(iconTone({ color }))}>{icon}</span>
            </div>
            {loading ? (
                <div className="mt-6 space-y-2">
                    <div className="h-9 w-28 animate-pulse rounded-md bg-muted" />
                    <div className="h-4 w-3/4 animate-pulse rounded-md bg-muted" />
                </div>
            ) : (
                <div className="mt-6 space-y-1">
                    <div className="text-3xl font-semibold tracking-tight">{value}</div>
                    {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
                </div>
            )}
        </section>
    );
}
