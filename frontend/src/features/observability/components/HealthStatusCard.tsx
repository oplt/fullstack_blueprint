import { colorMix } from "@/lib/color";import type { ReactNode } from "react";
import type { HealthStatus } from "../types";

const STATUS_COLORS: Record<HealthStatus, "success" | "warning" | "error" | "default" | "info"> = {
    healthy: "success",
    degraded: "warning",
    down: "error",
    unknown: "default",
    not_configured: "info",
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
    const paletteColor = STATUS_COLORS[status] === "default" ? "var(--muted-foreground)" : `var(--${STATUS_COLORS[status]})`;
    const checkedAt = formatCheckedAt(lastCheckedAt);

    return (
        <div
            style={({
                padding: 16,
                borderRadius: 4,
                border: "none",
                boxShadow: "none",
                minHeight: 180,

                backgroundColor: "var(--card)"
            })}
        >
            <div className="flex gap-3" style={{ height: "100%" }}>
                <div className="flex flex-row gap-3 items-start justify-between">
                    <div style={{ minWidth: 0 }}>
                        <p>{title}</p>
                        <div className="mt-2 inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />
                    </div>
                    <div
                        style={{
                            width: 38,
                            height: 38,
                            borderRadius: 12,
                            display: "grid",
                            placeItems: "center",
                            color: paletteColor,
                            backgroundColor: colorMix(paletteColor, 0.1),
                            flex: "0 0 auto",
                        }}
                    >
                        {icon}
                    </div>
                </div>
                {metric && (
                    <h6 style={{ lineHeight: 1.2 }}>
                        {metric}
                    </h6>
                )}
                <p style={{ flexGrow: 1 }} className="text-muted-foreground">
                    {detail}
                </p>
                {checkedAt && (
                    <span className="text-muted-foreground">
                        Checked {checkedAt}
                    </span>
                )}
            </div>
        </div>
    );
}
