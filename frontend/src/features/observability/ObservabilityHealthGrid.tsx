import type { ReactNode } from "react";
import {
    Server,
    Bug,
    RotateCw,
    HardDrive,
    Network,
    ChartNoAxesCombined,
    Clock3,
    Gauge,
    Activity,
    Globe2,
    History,
} from "lucide-react";
import { EmptyState } from "../../components/Feedback";
import { ResponsiveCardGrid } from "../../components/Section";
import { SectionCard } from "../../components/Section";
import { Skeleton } from "../../components/ui/skeleton";
import { fallbackItem, metricFor, type HealthKey } from "./observabilityModel";
import { HealthStatusCard } from "./HealthStatusCard";
import type { ObservabilityViewModel } from "./useObservabilityView";

const HEALTH_CARDS: Array<{ key: HealthKey; title: string; icon: ReactNode }> = [
    { key: "api", title: "API Status", icon: <Server aria-hidden="true" className="size-(--icon-size-md)" /> },
    { key: "frontend", title: "Frontend Status", icon: <Globe2 aria-hidden="true" className="size-(--icon-size-md)" /> },
    { key: "database", title: "Database", icon: <HardDrive aria-hidden="true" className="size-(--icon-size-md)" /> },
    { key: "cache", title: "Cache / Redis", icon: <RotateCw aria-hidden="true" className="size-(--icon-size-md)" /> },
    { key: "workers", title: "Worker Queue", icon: <History aria-hidden="true" className="size-(--icon-size-md)" /> },
    { key: "backgroundJobs", title: "Background Jobs", icon: <Clock3 aria-hidden="true" className="size-(--icon-size-md)" /> },
    { key: "errorRate", title: "Error Rate", icon: <Bug aria-hidden="true" className="size-(--icon-size-md)" /> },
    { key: "requestLatency", title: "Request Latency", icon: <Gauge aria-hidden="true" className="size-(--icon-size-md)" /> },
    { key: "prometheus", title: "Prometheus", icon: <HardDrive aria-hidden="true" className="size-(--icon-size-md)" /> },
    { key: "grafana", title: "Grafana", icon: <ChartNoAxesCombined aria-hidden="true" className="size-(--icon-size-md)" /> },
    { key: "tempo", title: "Tempo", icon: <Activity aria-hidden="true" className="size-(--icon-size-md)" /> },
];

type Props = Pick<ObservabilityViewModel, "healthItems" | "statusQuery">;

export function ObservabilityHealthGrid({ healthItems, statusQuery }: Props) {
    return (
        <SectionCard title="System health" description="Lightweight checks from the app plus local observability tool reachability.">
            {statusQuery.isLoading ? (
                <ResponsiveCardGrid columns={4}>
                    {Array.from({ length: 8 }).map((_, index) => (
                        <Skeleton key={index} className="ui-stat-card-skeleton" />
                    ))}
                </ResponsiveCardGrid>
            ) : statusQuery.isError ? (
                <EmptyState
                    icon={<Network />}
                    title="Health checks are unavailable"
                    description="The page could not load observability status right now. Tool links remain available when configured."
                />
            ) : (
                <ResponsiveCardGrid columns={4}>
                    {HEALTH_CARDS.map((card) => {
                        const item = healthItems[card.key] ?? fallbackItem("Status check is not configured");
                        return <HealthStatusCard key={card.key} title={card.title} status={item.status} detail={item.detail}
                            metric={metricFor(item)} lastCheckedAt={item.last_checked_at} icon={card.icon} />;
                    })}
                </ResponsiveCardGrid>
            )}
        </SectionCard>
    );
}
