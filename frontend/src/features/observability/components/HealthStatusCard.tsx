import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { HealthStatus } from "../types";

const STATUS_VARIANTS: Record<HealthStatus, "success" | "warning" | "destructive" | "outline" | "information"> = {
    healthy: "success",
    degraded: "warning",
    down: "destructive",
    unknown: "outline",
    not_configured: "information",
};

type HealthStatusCardProps = {
    title: string;
    status: HealthStatus;
    detail: string;
    metric?: string | null;
    lastCheckedAt?: string | null;
    icon: ReactNode;
};

function formatCheckedAt(value?: string | null) {
    if (!value) {
        return null;
    }

    return new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).format(new Date(value));
}

export function HealthStatusCard({
    title,
    status,
    detail,
    metric,
    lastCheckedAt,
    icon,
}: HealthStatusCardProps) {
    const checkedAt = formatCheckedAt(lastCheckedAt);
    const statusLabel = status.replaceAll("_", " ");

    return (
        <article className="flex min-h-44 flex-col gap-3 rounded-md border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="text-title-md font-medium">{title}</h3>
                    <Badge className="mt-2" variant={STATUS_VARIANTS[status]}>{statusLabel}</Badge>
                </div>
                <div className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-md",
                    status === "healthy" && "bg-success-soft text-success-deep",
                    status === "degraded" && "bg-warning-soft text-warning-deep",
                    status === "down" && "bg-destructive-soft text-destructive-deep",
                    status === "unknown" && "bg-muted text-muted-foreground",
                    status === "not_configured" && "bg-information/10 text-information",
                )}>
                    {icon}
                </div>
            </div>
            {metric && <p className="text-display-sm font-semibold leading-tight">{metric}</p>}
            <p className="flex-1 text-body-sm text-muted-foreground">{detail}</p>
            {checkedAt && <span className="text-caption text-muted-foreground">Checked {checkedAt}</span>}
        </article>
    );
}
