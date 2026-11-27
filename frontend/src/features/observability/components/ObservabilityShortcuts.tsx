import type { ReactNode } from "react";
import {
    Server,
    BarChart3,
    Bug,
    RotateCw,
    HardDrive,
    Route,
    Clock3,
    Activity,
    Globe2,
    History,
} from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ResponsiveCardGrid } from "../../../components/ui/ResponsiveCardGrid";
import { SectionCard } from "../../../components/ui/SectionCard";
import { Skeleton } from "../../../components/ui/skeleton";
import type { ObservabilityToolLink } from "../types";
import { buildGrafanaUrl, buildTempoExploreUrl, openExternalUrl } from "../urlBuilders";
import type { ObservabilityViewModel } from "../hooks/useObservabilityView";
import { ObservabilityShortcutCard } from "./ObservabilityShortcutCard";

type Shortcut = {
    title: string;
    description: string;
    buttonText: string;
    link?: ObservabilityToolLink;
    url: string | null;
    icon: ReactNode;
    adminOnly?: boolean;
};

type Props = Pick<ObservabilityViewModel, "context" | "isAdmin" | "linksQuery">;

export function ObservabilityShortcuts({ context, isAdmin, linksQuery }: Props) {
    const links = linksQuery.data;
    const dashboard = (key: keyof NonNullable<typeof links>["dashboards"]) =>
        buildGrafanaUrl(links?.dashboards[key].url, context);
    const shortcuts: Shortcut[] = [
        { title: "Application Overview", description: "High-level service health, request volume, latency, errors, and saturation.", buttonText: "Open dashboard", link: links?.dashboards.application_overview, url: dashboard("application_overview"), icon: <BarChart3 color="primary" /> },
        { title: "Backend API", description: "HTTP latency, request rate, error rate, status codes, and slow endpoints.", buttonText: "Open API view", link: links?.dashboards.api, url: dashboard("api"), icon: <Server color="primary" /> },
        { title: "Frontend Performance", description: "Frontend availability, client-side errors, page load timing, and user experience signals.", buttonText: "Open frontend view", link: links?.dashboards.frontend, url: dashboard("frontend"), icon: <Globe2 color="primary" /> },
        { title: "Database", description: "Connection pool usage, query latency, slow queries, locks, and availability.", buttonText: "Open database view", link: links?.dashboards.database, url: dashboard("database"), icon: <HardDrive color="primary" /> },
        { title: "Cache / Redis", description: "Cache hit rate, memory usage, command latency, evictions, and availability.", buttonText: "Open cache view", link: links?.dashboards.cache, url: dashboard("cache"), icon: <RotateCw color="primary" /> },
        { title: "Workers / Background Jobs", description: "Queue depth, task duration, retries, failures, and worker availability.", buttonText: "Open workers", link: links?.dashboards.workers, url: dashboard("workers"), icon: <History color="primary" /> },
        { title: "Scheduled Tasks", description: "Cron jobs, periodic jobs, execution duration, failed runs, and missed schedules.", buttonText: "Open schedules", link: links?.dashboards.scheduled_tasks, url: dashboard("scheduled_tasks"), icon: <Clock3 color="primary" /> },
        { title: "Error Investigation", description: "Recent errors, failing routes, affected services, and related traces.", buttonText: "Open errors", link: links?.dashboards.errors, url: dashboard("errors"), icon: <Bug color="primary" /> },
        { title: "Tempo Traces", description: "Investigate slow requests, failed workflows, and cross-service latency through Grafana Explore.", buttonText: "Explore traces", link: links?.tempo_explore_url, url: buildTempoExploreUrl(links?.tempo_explore_url.url, context), icon: <Activity color="primary" /> },
        { title: "Prometheus Debug", description: "Raw PromQL query UI for developer and admin investigation.", buttonText: "Open Prometheus", link: links?.prometheus_url, url: buildGrafanaUrl(links?.prometheus_url.url, context), icon: <HardDrive color="primary" />, adminOnly: true },
    ].filter((item) => !item.adminOnly || isAdmin);

    return (
        <SectionCard title="Shortcuts" description="Open Grafana as the main investigation surface. Prometheus is kept as an admin debug tool.">
            {linksQuery.isLoading ? (
                <ResponsiveCardGrid columns={3}>
                    {Array.from({ length: 6 }).map((_, index) => (
                        <Skeleton key={index} className="ui-stat-card-skeleton" />
                    ))}
                </ResponsiveCardGrid>
            ) : shortcuts.length === 0 ? (
                <EmptyState icon={<Route />} title="No observability shortcuts" description="Configure Grafana, Tempo, or Prometheus public URLs to enable launch links." />
            ) : (
                <ResponsiveCardGrid columns={3}>
                    {shortcuts.map((item) => <ObservabilityShortcutCard key={item.title} title={item.title}
                        description={item.description} buttonText={item.buttonText} url={item.url}
                        allowed={item.link?.allowed ?? false} configured={item.link?.configured ?? false}
                        icon={item.icon} onOpen={openExternalUrl} />)}
                </ResponsiveCardGrid>
            )}
        </SectionCard>
    );
}
