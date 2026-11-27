import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { lazy, Suspense } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ProtectedRoute } from "../components/guards/ProtectedRoute";
import { useAuth } from "../hooks/useAuth";
import { usePlatformMetadata } from "../hooks/usePlatformMetadata";
import AuthHomePage from "../pages/AuthHomePage";
import { RouteErrorBoundary } from "./RouteErrorBoundary";
import { ROUTES } from "@/config/routes";
import { capabilityAvailability, serverStateFromPlatformMetadata } from "@/config/application/capabilities";
import { useApplicationConfiguration } from "@/config/application/useConfiguration";
import type { CapabilityId } from "@/config/application/types";

const AppLayout = lazy(() =>
    import("../components/layout/AppLayout").then((module) => ({ default: module.AppLayout }))
);
const DashboardPage = lazy(() => import("../pages/DashboardPage"));
const CalendarPage = lazy(() => import("../pages/CalendarPage"));
const ProjectsPage = lazy(() => import("../pages/ProjectsPage"));
const ProjectDetailPage = lazy(() => import("../pages/ProjectDetailPage"));
const PlatformPage = lazy(() => import("../pages/PlatformPage"));
const ProfilePage = lazy(() => import("../pages/ProfilePage"));
const NotificationsPage = lazy(() => import("../pages/NotificationsPage"));
const ObservabilityPage = lazy(() => import("../pages/ObservabilityPage"));
const ResetPasswordPage = lazy(() => import("../pages/ResetPasswordPage"));
const VerifyEmailPage = lazy(() => import("../pages/VerifyEmailPage"));
const AdminUsersPage = lazy(() => import("../pages/AdminUsersPage"));
const AdminPlatformPage = lazy(() => import("../pages/AdminPlatformPage"));
const AdminSettingsPage = lazy(() => import("../pages/AdminSettingsPage"));
const AiStudioPage = lazy(() => import("../pages/AiStudioPage"));
const RagView = lazy(() =>
    import("../features/rag/RagView").then((m) => ({ default: m.default }))
);
const MemoryView = lazy(() =>
    import("../features/memory/MemoryView").then((m) => ({ default: m.default }))
);
const AgentView = lazy(() =>
    import("../features/agent/AgentView").then((m) => ({ default: m.default }))
);

function PageLoader() {
    return (
        <div className="space-y-6 p-4 md:p-6">
            <Skeleton className="h-[170px] w-full rounded-lg" />
            <div className="flex flex-col gap-4 md:flex-row">
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

function RoutedErrorBoundary({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    return <RouteErrorBoundary key={location.key}>{children}</RouteErrorBoundary>;
}

function NotFoundPage() {
    return (
        <div className="flex gap-4 items-center p-8" >
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
            <div className="flex gap-4 items-center p-8" >
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
    isAdmin,
    children,
}: {
    isReady: boolean;
    isAuthenticated: boolean;
    isAdmin: boolean;
    children: React.ReactNode;
}) {
    return (
        <CapabilityPage capability="admin">
            <ProtectedRoute
                isReady={isReady}
                isAuthenticated={isAuthenticated}
                isAdmin={isAdmin}
                requireAdmin
            >
                {children}
            </ProtectedRoute>
        </CapabilityPage>
    );
}

export function AppRouter() {
    const { isReady, isAuthenticated, isAdmin } = useAuth();

    return (
        <BrowserRouter>
            <RoutedErrorBoundary>
                <Routes>
                <Route path={ROUTES.home} element={<AuthHomePage />} />
                <Route path={ROUTES.resetPassword} element={<SuspensePage><ResetPasswordPage /></SuspensePage>} />
                <Route path={ROUTES.verifyEmail} element={<SuspensePage><VerifyEmailPage /></SuspensePage>} />

                <Route
                    element={
                        <ProtectedRoute isReady={isReady} isAuthenticated={isAuthenticated}>
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
            </RoutedErrorBoundary>
        </BrowserRouter>
    );
}
