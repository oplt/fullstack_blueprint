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
        <article className="flex flex-col ui-auto-health-status-card-article">
            <div className="flex items-start justify-between gap-ui-sm">
                <div className="min-w-0">
                    <h3 className="ui-auto-health-status-card-h3">{title}</h3>
                    <Badge className="mt-ui-xs" variant={STATUS_VARIANTS[status]}>{statusLabel}</Badge>
                </div>
                <div className={cn(
                    "grid shrink-0 ui-auto-health-status-card-div",
                    status === "healthy" && "ui-auto-health-status-card-div-5230a69",
                    status === "degraded" && "ui-auto-health-status-card-div-71186ce",
                    status === "down" && "ui-auto-health-status-card-div-793aa78",
                    status === "unknown" && "ui-auto-health-status-card-div-586170f",
                    status === "not_configured" && "ui-auto-health-status-card-div-1529c78",
                )}>
                    {icon}
                </div>
            </div>
            {metric && <p className="ui-auto-health-status-card-p">{metric}</p>}
            <p className="flex-1 ui-auto-health-status-card-p-c38609a">{detail}</p>
            {checkedAt && <span className="ui-auto-health-status-card-span">Checked {checkedAt}</span>}
        </article>
    );
}
