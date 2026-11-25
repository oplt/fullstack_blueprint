import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { listProjects } from "../api/projects";
import { capabilityAvailability, serverStateFromPlatformMetadata } from "@/config/application/capabilities";
import { useApplicationConfiguration } from "@/config/application/useConfiguration";
import { ROUTES } from "@/config/routes";
import { queryKeys } from "../config/queryKeys";
import { AccountHealthCard } from "../features/dashboard/components/AccountHealthCard";
import { DashboardCalendarSlot } from "../features/dashboard/components/DashboardCalendarSlot";
import { DashboardMetrics } from "../features/dashboard/components/DashboardMetrics";
import { ProjectSnapshot } from "../features/dashboard/components/ProjectSnapshot";
import { RecentActivityCard } from "../features/dashboard/components/RecentActivityCard";
import { useAuth } from "../hooks/useAuth";
import { useNotifications } from "../hooks/useNotifications";
import { usePlatformMetadata } from "../hooks/usePlatformMetadata";
import { PageShell } from "../components/ui/PageShell";

export default function DashboardPage() {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { data: platformMetadata } = usePlatformMetadata();
    const configuration = useApplicationConfiguration();
    const serverState = serverStateFromPlatformMetadata(platformMetadata);
    const projectsEnabled = capabilityAvailability("projects", configuration, serverState).available;
    const notificationsEnabled = capabilityAvailability("notifications", configuration, serverState).available;
    const calendarEnabled = capabilityAvailability("calendar", configuration, serverState).available;

    const projectsQuery = useQuery({
        queryKey: queryKeys.projects.all,
        queryFn: ({ signal }) => listProjects({ signal }),
        enabled: projectsEnabled,
    });
    const notificationsQuery = useNotifications({ enabled: notificationsEnabled });
    const coreDomainPlural = platformMetadata?.core_domain_plural ?? "Projects";
    const coreDomainSingular = platformMetadata?.core_domain_singular ?? "Project";
    const unreadCount = notificationsQuery.data?.filter((item) => !item.is_read).length ?? 0;

    return (
        <PageShell width="wide">
            <DashboardMetrics
                user={currentUser}
                coreDomainPlural={coreDomainPlural}
                projectsEnabled={projectsEnabled}
                projectCount={projectsQuery.data?.length}
                projectsLoading={projectsQuery.isLoading}
                notificationsEnabled={notificationsEnabled}
                unreadCount={unreadCount}
                notificationsLoading={notificationsQuery.isLoading}
            />
            <div className="stack dashboard-sections">
                <div className="dashboard-grid">
                    <ProjectSnapshot
                        enabled={projectsEnabled}
                        projects={projectsQuery.data}
                        isLoading={projectsQuery.isLoading}
                        isError={projectsQuery.isError}
                        error={projectsQuery.error}
                        coreDomainPlural={coreDomainPlural}
                        coreDomainSingular={coreDomainSingular}
                        onRetry={() => void projectsQuery.refetch()}
                        onCreate={() => navigate(ROUTES.projects)}
                    />
                    <AccountHealthCard user={currentUser} />
                </div>
                <div className="dashboard-grid">
                    <DashboardCalendarSlot
                        enabled={calendarEnabled}
                        projects={projectsQuery.data ?? []}
                        projectsLoading={projectsEnabled && projectsQuery.isLoading}
                        projectsEnabled={projectsEnabled}
                        onOpenProjects={() => navigate(ROUTES.projects)}
                    />
                    <RecentActivityCard
                        enabled={notificationsEnabled}
                        notifications={notificationsQuery.data}
                        isLoading={notificationsQuery.isLoading}
                        isError={notificationsQuery.isError}
                        error={notificationsQuery.error}
                        onRetry={() => void notificationsQuery.refetch()}
                    />
                </div>
            </div>
        </PageShell>
    );
}
