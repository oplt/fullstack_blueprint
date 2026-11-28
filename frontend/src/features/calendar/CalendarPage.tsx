import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../lib/routes";
import { listProjects } from "@/features/projects/api";
import { queryKeys } from "../../lib/queryKeys";
import { DashboardCalendar } from "../dashboard/DashboardCalendar";
import { PageShell } from "../../components/ui/PageShell";
import { QueryBoundary } from "../../components/ui/QueryBoundary";
import { usePlatformMetadata } from "../../lib/usePlatformMetadata";
import { useApplicationConfiguration } from "../../lib/useConfiguration";
import { capabilityAvailability, serverStateFromPlatformMetadata } from "../../lib/capabilities";

export default function CalendarPage() {
    const navigate = useNavigate();
    const { data: platformMetadata } = usePlatformMetadata();
    const configuration = useApplicationConfiguration();
    const projectsEnabled = capabilityAvailability(
        "projects",
        configuration,
        serverStateFromPlatformMetadata(platformMetadata),
    ).available;
    const {
        data: projects,
        isLoading: projectsLoading,
        isError: projectsIsError,
        error: projectsError,
        refetch: refetchProjects,
    } = useQuery({
        queryKey: queryKeys.projects.all,
        queryFn: ({ signal }) => listProjects({ signal }),
        enabled: projectsEnabled,
    });

    const coreDomainPlural = platformMetadata?.core_domain_plural ?? "Projects";

    return (
        <PageShell width="wide">
            <div className="flex flex-row justify-end mb-ui-md" >
                {projectsEnabled && <Button
                    variant="outline"
                    onClick={() => navigate(ROUTES.projects)}
                    type="button"
                >Open {coreDomainPlural}
                    <ArrowRight /></Button>}
            </div>

            <QueryBoundary
                isLoading={projectsEnabled && projectsLoading}
                isError={projectsEnabled && projectsIsError}
                error={projectsError}
                errorFallback={`Failed to load ${coreDomainPlural.toLowerCase()}.`}
                onRetry={() => void refetchProjects()}
                loadingFallback={
                    <DashboardCalendar
                        projects={[]}
                        projectsLoading={projectsEnabled}
                        projectsEnabled={projectsEnabled}
                        onOpenProjects={projectsEnabled ? () => navigate(ROUTES.projects) : undefined}
                        allowedViews={["day", "week", "month", "twelve_month"]}
                        initialView="twelve_month"
                    />
                }
            >
                <DashboardCalendar
                    projects={projects ?? []}
                    projectsLoading={false}
                    projectsEnabled={projectsEnabled}
                    onOpenProjects={projectsEnabled ? () => navigate(ROUTES.projects) : undefined}
                    allowedViews={["day", "week", "month", "twelve_month"]}
                    initialView="twelve_month"
                />
            </QueryBoundary>
        </PageShell>
    );
}
