import { Button } from "@/components/ui/button";import { useQuery } from "@tanstack/react-query";
import {
    FolderOpen as ProjectsIcon,
    Notifications as NotificationsIcon,
    Security as SecurityIcon,
    VerifiedUser as VerifiedUserIcon,
} from "@/components/ui/iconsCompat";
import { useNavigate } from "react-router-dom";
import { projectPath, ROUTES } from "../app/routes";
import { listProjects } from "../api/projects";
import { queryKeys } from "../config/queryKeys";
import { DashboardCalendar } from "../components/dashboard/DashboardCalendar";
import { NotificationListItem } from "../components/notifications/NotificationListItem";
import { PageShell } from "../components/ui/PageShell";
import { MetricGrid } from "../components/ui/MetricGrid";
import { QueryBoundary } from "../components/ui/QueryBoundary";
import { SectionCard } from "../components/ui/SectionCard";
import { StatCard } from "../components/ui/StatCard";
import { EmptyState } from "../components/ui/EmptyState";
import { useAuth } from "../hooks/useAuth";
import { useNotifications } from "../hooks/useNotifications";
import { usePlatformMetadata } from "../hooks/usePlatformMetadata";

export default function DashboardPage() {
    const navigate = useNavigate();
    const { currentUser: user } = useAuth();
    const { data: platformMetadata } = usePlatformMetadata();
    const projectsQuery = useQuery({
        queryKey: queryKeys.projects.all,
        queryFn: ({ signal }) => listProjects({ signal }),
    });
    const notificationsQuery = useNotifications();
    const {
        data: projects,
        isLoading: projectsLoading,
        isError: projectsIsError,
        error: projectsError,
        refetch: refetchProjects,
    } = projectsQuery;
    const {
        data: notifications,
        isLoading: notificationsLoading,
        isError: notificationsIsError,
        error: notificationsError,
        refetch: refetchNotifications,
    } = notificationsQuery;

    const coreDomainPlural = platformMetadata?.core_domain_plural ?? "Projects";
    const unreadCount = notifications?.filter((item) => !item.is_read).length ?? 0;
    const recentNotifications = notifications?.slice(0, 5) ?? [];
    const accountChecks = [
        {
            label: "Email verification",
            value: user?.is_verified ? "Verified" : "Action needed",
            color: user?.is_verified ? "success.main" : "warning.main",
            description: user?.is_verified
                ? "Your sign-in identity is confirmed."
                : "Verify your email to improve recovery and trust.",
        },
        {
            label: "Multi-factor authentication",
            value: user?.mfa_enabled ? "Enabled" : "Recommended",
            color: user?.mfa_enabled ? "success.main" : "warning.main",
            description: user?.mfa_enabled
                ? "An extra layer of account protection is active."
                : "Turn on MFA to reduce account risk.",
        },
    ];

    return (
        <PageShell width="wide">
            <MetricGrid>
                <StatCard
                    label={coreDomainPlural}
                    value={projects?.length ?? "—"}
                    description={`Total ${coreDomainPlural.toLowerCase()} in your workspace`}
                    icon={<ProjectsIcon />}
                    loading={projectsLoading}
                />
                <StatCard
                    label="Unread notifications"
                    value={notifications ? unreadCount : "—"}
                    description="New updates waiting for a response"
                    icon={<NotificationsIcon />}
                    loading={notificationsLoading}
                    color="warning"
                />
                <StatCard
                    label="Email status"
                    value={user?.is_verified ? "Verified" : "Pending"}
                    description="Identity confirmation for your account"
                    icon={<VerifiedUserIcon />}
                    color={user?.is_verified ? "success" : "warning"}
                />
                <StatCard
                    label="Multi-factor auth"
                    value={user?.mfa_enabled ? "Enabled" : "Not enabled"}
                    description="Additional sign-in protection"
                    icon={<SecurityIcon />}
                    color={user?.mfa_enabled ? "success" : "secondary"}
                />
            </MetricGrid>

            <div style={{ display: "grid", gap: 16 }}>
                <div
                    style={{
                        display: "grid",
                        gap: 16,
                        gridTemplateColumns: "1fr",
                        alignItems: "stretch",
                    }}
                >
                    <SectionCard
                        title={`${coreDomainPlural} snapshot`}
                        description={`A quick look at the current ${coreDomainPlural.toLowerCase()} in your workspace.`}
                    >
                        <QueryBoundary
                            isLoading={projectsLoading}
                            isError={projectsIsError}
                            error={projectsError}
                            errorFallback={`Failed to load ${coreDomainPlural.toLowerCase()}.`}
                            onRetry={() => void refetchProjects()}
                            isEmpty={!projects || projects.length === 0}
                            emptyFallback={
                                <EmptyState
                                    icon={<ProjectsIcon />}
                                    title={`No ${coreDomainPlural.toLowerCase()} yet`}
                                    description={`Create your first ${platformMetadata?.core_domain_singular?.toLowerCase() ?? "project"} to start building out the workspace.`}
                                    action={
                                        <Button variant="default" onClick={() => navigate("/projects")} type="button">
                                            Create a project
                                        </Button>
                                    }
                                />
                            }
                        >
                            <div
                                style={{
                                    display: "grid",
                                    gap: 10,
                                    gridTemplateColumns: "1fr",
                                }}
                            >
                                {projects?.slice(0, 6).map((project) => (
                                    <div
                                        key={project.id}
                                        onClick={() => navigate(projectPath(project.id))}
                                        style={({
                                            padding: 16,
                                            borderRadius: 4,
                                            backgroundColor: "var(--card)",
                                            border: 1,
                                            borderColor: "divider",
                                            cursor: "pointer"
                                        })}
                                    >
                                        <p>{project.name}</p>
                                        <p style={{ marginTop: 4 }} className="text-muted-foreground">
                                            {project.description ||
                                                `No description added for this ${platformMetadata?.core_domain_singular?.toLowerCase() ?? "project"} yet.`}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </QueryBoundary>
                    </SectionCard>

                    <SectionCard
                        title="Account health"
                        description="Settings that affect trust and security."
                        compact
                        contentSx={{ display: "flex", flexDirection: "column" }}
                    >
                        <div className="flex gap-[12px]" style={{ flex: 1 }}>
                            {accountChecks.map((item) => (
                                <div
                                    key={item.label}
                                    style={({
                                        padding: 12,
                                        borderRadius: 4,
                                        flex: 1,
                                        backgroundColor: "var(--card)",
                                        border: 1,
                                        borderColor: "divider"
                                    })}
                                >
                                    <div
                                        className="flex flex-row gap-[8px] justify-between"
                                        style={{ marginBottom: 4 }}>
                                        <p>{item.label}</p>
                                        <p style={{ color: item.color, fontWeight: 500 }}>
                                            {item.value}
                                        </p>
                                    </div>
                                    <p className="text-muted-foreground">
                                        {item.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </SectionCard>
                </div>

                <div
                    style={{
                        display: "grid",
                        gap: 16,
                        gridTemplateColumns: "1fr",
                        alignItems: "stretch",
                    }}
                >
                    {platformMetadata?.available_features?.includes("calendar") && <DashboardCalendar
                        projects={projects ?? []}
                        projectsLoading={projectsLoading}
                        onOpenProjects={() => navigate("/projects")}
                        allowedViews={["month"]}
                        initialView="month"
                    />}

                    <SectionCard
                        title="Recent activity"
                        description="The latest notifications and alerts across your account."
                        contentSx={{ display: "flex", flexDirection: "column", minHeight: 0 }}
                        action={
                                            <Button
                                                variant="ghost"
                                                onClick={() => navigate(ROUTES.notifications)}
                                                type="button">
                                Open all
                            </Button>
                        }
                    >
                        <QueryBoundary
                            isLoading={notificationsLoading}
                            isError={notificationsIsError}
                            error={notificationsError}
                            errorFallback="Failed to load notifications."
                            onRetry={() => void refetchNotifications()}
                            isEmpty={recentNotifications.length === 0}
                            emptyFallback={
                                <EmptyState
                                    icon={<NotificationsIcon />}
                                    title="No notifications yet"
                                    description="Updates, reminders, and account events will appear here as soon as the workspace becomes active."
                                    action={
                                        <Button variant="outline" onClick={() => navigate("/projects")} type="button">
                                            Explore workspace
                                        </Button>
                                    }
                                />
                            }
                        >
                            <div
                                className="flex gap-[12px]"
                                style={{ flex: 1, minHeight: 0, maxHeight: "100%", overflow: "auto" }}
                            >
                                {recentNotifications.map((notification) => (
                                    <NotificationListItem
                                        key={notification.id}
                                        notification={notification}
                                        variant="compact"
                                    />
                                ))}
                            </div>
                        </QueryBoundary>
                    </SectionCard>
                </div>
            </div>
        </PageShell>
    );
}
