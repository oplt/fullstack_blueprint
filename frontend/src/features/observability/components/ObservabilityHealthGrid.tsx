import type { ReactNode } from "react";
import {
    Server as ApiIcon,
    Bug as ErrorIcon,
    RotateCw as CacheIcon,
    HardDrive as DatabaseIcon,
    Network as ObservabilityIcon,
    ChartNoAxesCombined as MetricsIcon,
    Clock3 as ScheduleIcon,
    Gauge as LatencyIcon,
    HardDrive as PrometheusIcon,
    Activity as TracesIcon,
    Globe2 as FrontendIcon,
    History as WorkerIcon,
} from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { SectionCard } from "../../../components/ui/SectionCard";
import { fallbackItem, metricFor, type HealthKey } from "../observabilityModel";
import { HealthStatusCard } from "./HealthStatusCard";
import type { ObservabilityViewModel } from "../hooks/useObservabilityView";

const HEALTH_CARDS: Array<{ key: HealthKey; title: string; icon: ReactNode }> = [
    { key: "api", title: "API Status", icon: <ApiIcon fontSize="small" /> },
    { key: "frontend", title: "Frontend Status", icon: <FrontendIcon fontSize="small" /> },
    { key: "database", title: "Database", icon: <DatabaseIcon fontSize="small" /> },
    { key: "cache", title: "Cache / Redis", icon: <CacheIcon fontSize="small" /> },
    { key: "workers", title: "Worker Queue", icon: <WorkerIcon fontSize="small" /> },
    { key: "backgroundJobs", title: "Background Jobs", icon: <ScheduleIcon fontSize="small" /> },
    { key: "errorRate", title: "Error Rate", icon: <ErrorIcon fontSize="small" /> },
    { key: "requestLatency", title: "Request Latency", icon: <LatencyIcon fontSize="small" /> },
    { key: "prometheus", title: "Prometheus", icon: <PrometheusIcon fontSize="small" /> },
    { key: "grafana", title: "Grafana", icon: <MetricsIcon fontSize="small" /> },
    { key: "tempo", title: "Tempo", icon: <TracesIcon fontSize="small" /> },
];

type Props = Pick<ObservabilityViewModel, "healthItems" | "statusQuery">;

export function ObservabilityHealthGrid({ healthItems, statusQuery }: Props) {
    return (
        <SectionCard title="System health" description="Lightweight checks from the app plus local observability tool reachability.">
            {statusQuery.isLoading ? (
                <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr" }}>
                    {Array.from({ length: 8 }).map((_: any, index: any) => <div
                        key={index}
                        style={{ borderRadius: 16 }}
                        className="animate-pulse rounded-md bg-muted" />)}
                </div>
            ) : statusQuery.isError ? (
                <EmptyState
                    icon={<ObservabilityIcon />}
                    title="Health checks are unavailable"
                    description="The page could not load observability status right now. Tool links remain available when configured."
                />
            ) : (
                <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr" }}>
                    {HEALTH_CARDS.map((card) => {
                        const item = healthItems[card.key] ?? fallbackItem("Status check is not configured");
                        return <HealthStatusCard key={card.key} title={card.title} status={item.status} detail={item.detail}
                            metric={metricFor(item)} lastCheckedAt={item.last_checked_at} icon={card.icon} />;
                    })}
                </div>
            )}
        </SectionCard>
    );
}
