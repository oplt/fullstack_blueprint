import { useQuery } from "@tanstack/react-query";
import { Button, Stack } from "@/components/ui/muiCompat";
import { ArrowForward as ArrowForwardIcon } from "@/components/ui/iconsCompat";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../app/routes";
import { listProjects } from "../api/projects";
import { queryKeys } from "../config/queryKeys";
import { DashboardCalendar } from "../components/dashboard/DashboardCalendar";
import { PageShell } from "../components/ui/PageShell";
import { QueryBoundary } from "../components/ui/QueryBoundary";
import { usePlatformMetadata } from "../hooks/usePlatformMetadata";

export default function CalendarPage() {
    const navigate = useNavigate();
    const { data: platformMetadata } = usePlatformMetadata();
    const {
        data: projects,
        isLoading: projectsLoading,
        isError: projectsIsError,
        error: projectsError,
        refetch: refetchProjects,
    } = useQuery({
        queryKey: queryKeys.projects.all,
        queryFn: ({ signal }) => listProjects({ signal }),
    });

    const coreDomainPlural = platformMetadata?.core_domain_plural ?? "Projects";

    return (
        <PageShell maxWidth="xl">
            <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
                <Button
                    variant="outlined"
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => navigate(ROUTES.projects)}
                >
                    Open {coreDomainPlural}
                </Button>
            </Stack>

            <QueryBoundary
                isLoading={projectsLoading}
                isError={projectsIsError}
                error={projectsError}
                errorFallback={`Failed to load ${coreDomainPlural.toLowerCase()}.`}
                onRetry={() => void refetchProjects()}
                loadingFallback={
                    <DashboardCalendar
                        projects={[]}
                        projectsLoading
                        onOpenProjects={() => navigate(ROUTES.projects)}
                        allowedViews={["day", "week", "month", "twelve_month"]}
                        initialView="twelve_month"
                    />
                }
            >
                <DashboardCalendar
                    projects={projects ?? []}
                    projectsLoading={false}
                    onOpenProjects={() => navigate(ROUTES.projects)}
                    allowedViews={["day", "week", "month", "twelve_month"]}
                    initialView="twelve_month"
                />
            </QueryBoundary>
        </PageShell>
    );
}
