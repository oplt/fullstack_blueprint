import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, Link } from "react-router-dom";
import { Box, Button, Skeleton, Stack, Typography } from "@mui/material";
import { ProtectedRoute } from "../components/guards/ProtectedRoute";
import { useAuth } from "../hooks/useAuth";
import { usePlatformMetadata } from "../hooks/usePlatformMetadata";
import AuthHomePage from "../pages/AuthHomePage";

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
        <Box sx={{ px: { xs: 2, md: 3 }, py: { xs: 3, md: 4 } }}>
            <Stack spacing={3}>
                <Skeleton variant="rounded" height={170} sx={{ borderRadius: 2 }} />
                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                    <Skeleton variant="rounded" height={168} sx={{ borderRadius: 2, flex: 1 }} />
                    <Skeleton variant="rounded" height={168} sx={{ borderRadius: 2, flex: 1 }} />
                    <Skeleton variant="rounded" height={168} sx={{ borderRadius: 2, flex: 1 }} />
                </Stack>
                <Skeleton variant="rounded" height={260} sx={{ borderRadius: 5 }} />
            </Stack>
        </Box>
    );
}

function SuspensePage({ children }: { children: React.ReactNode }) {
    return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function NotFoundPage() {
    return (
        <Stack spacing={2} alignItems="center" sx={{ p: 4 }}>
            <Typography variant="h4" component="h1">Page not found</Typography>
            <Button component={Link} to="/">Back to home</Button>
        </Stack>
    );
}

function FeaturePage({ feature, children }: { feature: string; children: React.ReactNode }) {
    const { data, isPending, isError, refetch } = usePlatformMetadata();
    if (isPending) return <PageLoader />;
    if (isError) {
        return (
            <Stack spacing={2} alignItems="center" sx={{ p: 4 }}>
                <Typography role="alert">Could not load application settings.</Typography>
                <Button onClick={() => void refetch()}>Retry</Button>
            </Stack>
        );
    }
    return data?.available_features?.includes(feature)
        ? <SuspensePage>{children}</SuspensePage>
        : <NotFoundPage />;
}

export function AppRouter() {
    const { isReady, isAuthenticated, isAdmin } = useAuth();

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<AuthHomePage />} />
                <Route path="/reset-password" element={<SuspensePage><ResetPasswordPage /></SuspensePage>} />
                <Route path="/verify-email" element={<SuspensePage><VerifyEmailPage /></SuspensePage>} />

                <Route
                    element={
                        <ProtectedRoute isReady={isReady} isAuthenticated={isAuthenticated}>
                            <Suspense fallback={<PageLoader />}>
                                <AppLayout />
                            </Suspense>
                        </ProtectedRoute>
                    }
                >
                    <Route path="/dashboard" element={<SuspensePage><DashboardPage /></SuspensePage>} />
                    <Route path="/calendar" element={<FeaturePage feature="calendar"><CalendarPage /></FeaturePage>} />
                    <Route path="/projects" element={<SuspensePage><ProjectsPage /></SuspensePage>} />
                    <Route path="/projects/:projectId" element={<SuspensePage><ProjectDetailPage /></SuspensePage>} />
                    <Route path="/platform" element={<SuspensePage><PlatformPage /></SuspensePage>} />
                    <Route path="/ai" element={<FeaturePage feature="ai"><AiStudioPage /></FeaturePage>} />
                    <Route path="/rag" element={<FeaturePage feature="rag"><RagView /></FeaturePage>} />
                    <Route path="/memory" element={<FeaturePage feature="memory"><MemoryView /></FeaturePage>} />
                    <Route path="/agent" element={<FeaturePage feature="ai"><AgentView /></FeaturePage>} />
                    <Route path="/observability" element={<FeaturePage feature="observability"><ObservabilityPage /></FeaturePage>} />
                    <Route path="/profile" element={<SuspensePage><ProfilePage /></SuspensePage>} />
                    <Route path="/notifications" element={<SuspensePage><NotificationsPage /></SuspensePage>} />
                    <Route
                        path="/admin/users"
                        element={
                            <ProtectedRoute
                                isReady={isReady}
                                isAuthenticated={isAuthenticated}
                                isAdmin={isAdmin}
                                requireAdmin
                            >
                                <SuspensePage><AdminUsersPage /></SuspensePage>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/platform"
                        element={
                            <ProtectedRoute
                                isReady={isReady}
                                isAuthenticated={isAuthenticated}
                                isAdmin={isAdmin}
                                requireAdmin
                            >
                                <SuspensePage><AdminPlatformPage /></SuspensePage>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/settings"
                        element={
                            <ProtectedRoute
                                isReady={isReady}
                                isAuthenticated={isAuthenticated}
                                isAdmin={isAdmin}
                                requireAdmin
                            >
                                <SuspensePage><AdminSettingsPage /></SuspensePage>
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/app" element={<Navigate to="/dashboard" replace />} />
                </Route>

                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </BrowserRouter>
    );
}
