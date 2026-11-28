import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { lazy, Suspense } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { useAuth } from "../features/identity/useAuth";
import { usePlatformMetadata } from "../lib/usePlatformMetadata";
import AuthHomePage from "../features/identity/AuthHomePage";
import { ROUTES } from "../lib/routes";
import { capabilityAvailability, serverStateFromPlatformMetadata } from "../lib/capabilities";
import { useApplicationConfiguration } from "../lib/useConfiguration";
import type { CapabilityId } from "@/lib/configurationTypes";

const AppLayout = lazy(() =>
    import("./AppLayout").then((module) => ({ default: module.AppLayout }))
);
const DashboardPage = lazy(() => import("../features/dashboard/DashboardPage"));
const CalendarPage = lazy(() => import("../features/calendar/CalendarPage"));
const ProjectsPage = lazy(() => import("../features/projects/ProjectsPage"));
const ProjectDetailPage = lazy(() => import("../features/projects/ProjectDetailPage"));
const PlatformPage = lazy(() => import("../features/integrations/PlatformPage"));
const ProfilePage = lazy(() => import("../features/identity/ProfilePage"));
const NotificationsPage = lazy(() => import("../features/notifications/NotificationsPage"));
const ObservabilityPage = lazy(() => import("../features/observability/ObservabilityPage"));
const ResetPasswordPage = lazy(() => import("../features/identity/ResetPasswordPage"));
const VerifyEmailPage = lazy(() => import("../features/identity/VerifyEmailPage"));
const AdminUsersPage = lazy(() => import("../features/admin/AdminUsersPage"));
const AdminPlatformPage = lazy(() => import("../features/admin/AdminPlatformPage"));
const AdminSettingsPage = lazy(() => import("../features/admin/AdminSettingsPage"));
const AiStudioPage = lazy(() => import("../features/ai/AiStudioPage"));
const RagView = lazy(() =>
    import("../features/rag/RagView").then((m) => ({ default: m.default }))
);
const MemoryView = lazy(() =>
    import("../features/memory/MemoryView").then((m) => ({ default: m.default }))
);
const AgentView = lazy(() =>
    import("../features/agents/AgentView").then((m) => ({ default: m.default }))
);

function PageLoader() {
    return (
        <div className="flex flex-col gap-ui-lg p-ui-md md:p-ui-lg">
            <Skeleton className="h-[170px] w-full rounded-lg" />
            <div className="flex flex-col gap-ui-md md:flex-row">
                <Skeleton className="h-[168px] min-w-0 flex-1 rounded-lg" />
                <Skeleton className="h-[168px] min-w-0 flex-1 rounded-lg" />
                <Skeleton className="h-[168px] min-w-0 flex-1 rounded-lg" />
            </div>
            <Skeleton className="h-[260px] w-full rounded-2xl" />
        </div>
    );
}

function SuspensePage({ children }: { children: React.ReactNode }) {
    return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function NotFoundPage() {
    return (
        <div className="flex gap-ui-md items-center p-8" >
            <h1>Page not found</h1>
            <Button render={<Link to={ROUTES.home} />} type="button">Back to home</Button>
        </div>
    );
}

function CapabilityPage({ feature, capability, children }: { feature?: string; capability: CapabilityId; children: React.ReactNode }) {
    const { data, isPending, isError, refetch } = usePlatformMetadata();
    const configuration = useApplicationConfiguration();
    if (isPending) return <PageLoader />;
    if (isError) {
        return (
            <div className="flex gap-ui-md items-center p-8" >
                <span role="alert">Could not load application settings.</span>
                <Button onClick={() => void refetch()} type="button">Retry</Button>
            </div>
        );
    }
    const availability = capabilityAvailability(capability, configuration, serverStateFromPlatformMetadata(data));
    const serverFeatureEnabled = !feature || data?.available_features?.includes(feature) === true;
    return serverFeatureEnabled && availability.available
        ? <SuspensePage>{children}</SuspensePage>
        : <NotFoundPage />;
}

function FeaturePage({ feature, capability, children }: { feature: string; capability: CapabilityId; children: React.ReactNode }) {
    return <CapabilityPage feature={feature} capability={capability}>{children}</CapabilityPage>;
}

function AdminPage({
    isReady,
    isAuthenticated,
    authStatus,
    retryAuth,
    isAdmin,
    children,
}: {
    isReady: boolean;
    isAuthenticated: boolean;
    authStatus: "initializing" | "authenticated" | "anonymous" | "unavailable";
    retryAuth: () => Promise<unknown>;
    isAdmin: boolean;
    children: React.ReactNode;
}) {
    return (
        <CapabilityPage capability="admin">
            <ProtectedRoute
                isReady={isReady}
                isAuthenticated={isAuthenticated}
                authStatus={authStatus}
                retryAuth={retryAuth}
                isAdmin={isAdmin}
                requireAdmin
            >
                {children}
            </ProtectedRoute>
        </CapabilityPage>
    );
}

export function AppRouter() {
    const { isReady, isAuthenticated, authStatus, retryAuth, isAdmin } = useAuth();

    return (
        <BrowserRouter>
            <Routes>
                <Route path={ROUTES.home} element={<AuthHomePage />} />
                <Route path={ROUTES.resetPassword} element={<SuspensePage><ResetPasswordPage /></SuspensePage>} />
                <Route path={ROUTES.verifyEmail} element={<SuspensePage><VerifyEmailPage /></SuspensePage>} />

                <Route
                    element={
                        <ProtectedRoute isReady={isReady} isAuthenticated={isAuthenticated} authStatus={authStatus} retryAuth={retryAuth}>
                            <Suspense fallback={<PageLoader />}>
                                <AppLayout />
                            </Suspense>
                        </ProtectedRoute>
                    }
                >
                    <Route path={ROUTES.dashboard} element={<CapabilityPage capability="dashboard"><DashboardPage /></CapabilityPage>} />
                    <Route path={ROUTES.calendar} element={<FeaturePage feature="calendar" capability="calendar"><CalendarPage /></FeaturePage>} />
                    <Route path={ROUTES.projects} element={<CapabilityPage capability="projects"><ProjectsPage /></CapabilityPage>} />
                    <Route path={ROUTES.project} element={<CapabilityPage capability="projects"><ProjectDetailPage /></CapabilityPage>} />
                    <Route path={ROUTES.platform} element={<CapabilityPage capability="platform"><PlatformPage /></CapabilityPage>} />
                    <Route path={ROUTES.ai} element={<FeaturePage feature="ai" capability="ai"><AiStudioPage /></FeaturePage>} />
                    <Route path={ROUTES.rag} element={<FeaturePage feature="rag" capability="rag"><RagView /></FeaturePage>} />
                    <Route path={ROUTES.memory} element={<FeaturePage feature="memory" capability="memory"><MemoryView /></FeaturePage>} />
                    <Route path={ROUTES.agent} element={<FeaturePage feature="ai" capability="agent"><AgentView /></FeaturePage>} />
                    <Route path={ROUTES.observability} element={<FeaturePage feature="observability" capability="observability"><ObservabilityPage /></FeaturePage>} />
                    <Route path={ROUTES.profile} element={<CapabilityPage capability="profile"><ProfilePage /></CapabilityPage>} />
                    <Route path={ROUTES.notifications} element={<CapabilityPage capability="notifications"><NotificationsPage /></CapabilityPage>} />
                    <Route
                        path={ROUTES.adminUsers}
                        element={
                            <AdminPage
                                isReady={isReady}
                                isAuthenticated={isAuthenticated}
                                authStatus={authStatus}
                                retryAuth={retryAuth}
                                isAdmin={isAdmin}
                            >
                                <SuspensePage><AdminUsersPage /></SuspensePage>
                            </AdminPage>
                        }
                    />
                    <Route
                        path={ROUTES.adminPlatform}
                        element={
                            <AdminPage
                                isReady={isReady}
                                isAuthenticated={isAuthenticated}
                                authStatus={authStatus}
                                retryAuth={retryAuth}
                                isAdmin={isAdmin}
                            >
                                <SuspensePage><AdminPlatformPage /></SuspensePage>
                            </AdminPage>
                        }
                    />
                    <Route
                        path={ROUTES.adminSettings}
                        element={
                            <AdminPage
                                isReady={isReady}
                                isAuthenticated={isAuthenticated}
                                authStatus={authStatus}
                                retryAuth={retryAuth}
                                isAdmin={isAdmin}
                            >
                                <SuspensePage><AdminSettingsPage /></SuspensePage>
                            </AdminPage>
                        }
                    />
                    <Route path={ROUTES.appRedirect} element={<Navigate to={ROUTES.dashboard} replace />} />
                </Route>

                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </BrowserRouter>
    );
}
