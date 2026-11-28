import type { GrafanaUrlContext, ObservabilityStatus, ObservabilityStatusItem } from "./types";

export type HealthKey =
    | "api" | "frontend" | "database" | "cache" | "workers" | "backgroundJobs"
    | "errorRate" | "requestLatency" | "prometheus" | "grafana" | "tempo";

export const SERVICES = ["backend", "frontend", "worker"];
export const ENVIRONMENTS = ["local", "development", "staging", "production"];
export const TIME_RANGES = [
    { label: "Last 15 minutes", from: "now-15m", to: "now" },
    { label: "Last hour", from: "now-1h", to: "now" },
    { label: "Last 6 hours", from: "now-6h", to: "now" },
    { label: "Last 24 hours", from: "now-24h", to: "now" },
];

const HEALTH_FIELDS: Array<[HealthKey, keyof ObservabilityStatus]> = [
    ["api", "api"],
    ["frontend", "frontend"],
    ["database", "database"],
    ["cache", "cache"],
    ["workers", "workers"],
    ["backgroundJobs", "background_jobs"],
    ["errorRate", "error_rate"],
    ["requestLatency", "request_latency"],
    ["prometheus", "prometheus"],
    ["grafana", "grafana"],
    ["tempo", "tempo"],
];

export function buildHealthItems(status?: ObservabilityStatus): Record<HealthKey, ObservabilityStatusItem | undefined> {
    return Object.fromEntries(
        HEALTH_FIELDS.map(([key, field]) => [key, status?.[field]])
    ) as Record<HealthKey, ObservabilityStatusItem | undefined>;
}

export function metricFor(item?: ObservabilityStatusItem) {
    return item?.value ??
        (item?.queue_depth !== undefined && item.queue_depth !== null ? `${item.queue_depth} queued` : null);
}

export function fallbackItem(detail: string): ObservabilityStatusItem {
    return { status: "unknown", detail };
}

export type ObservabilityFilters = {
    service: string;
    environment: string;
    route: string;
    jobName: string;
    traceId: string;
    requestId: string;
    timeRangeIndex: number;
};

export function buildObservabilityContext(values: ObservabilityFilters): GrafanaUrlContext {
    const timeRange = TIME_RANGES[values.timeRangeIndex] ?? TIME_RANGES[1];
    return {
        service: values.service,
        environment: values.environment,
        route: values.route,
        jobName: values.jobName,
        traceId: values.traceId,
        requestId: values.requestId,
        from: timeRange.from,
        to: timeRange.to,
        orgId: "1",
    };
}
