/**
 * Canonical route contract for the browser application.
 *
 * Keeping path construction in one place prevents navigation links from
 * drifting away from the router and makes deep-link behavior easy to test.
 */
export const ROUTES = {
    home: "/",
    dashboard: "/dashboard",
    calendar: "/calendar",
    projects: "/projects",
    project: "/projects/:projectId",
    platform: "/platform",
    ai: "/ai",
    rag: "/rag",
    memory: "/memory",
    agent: "/agent",
    observability: "/observability",
    profile: "/profile",
    notifications: "/notifications",
    resetPassword: "/reset-password",
    verifyEmail: "/verify-email",
    adminUsers: "/admin/users",
    adminPlatform: "/admin/platform",
    adminSettings: "/admin/settings",
    appRedirect: "/app",
} as const;

type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

/** Build a project URL without allowing an id to change the route structure. */
export function projectPath(projectId: string): string {
    const encodedId = encodeURIComponent(projectId.trim());
    return encodedId ? ROUTES.projects + `/${encodedId}` : ROUTES.projects;
}

export type FeatureRoute = {
    path: RoutePath;
    feature: string;
};

export const FEATURE_ROUTES = [
    { path: ROUTES.calendar, feature: "calendar" },
    { path: ROUTES.ai, feature: "ai" },
    { path: ROUTES.rag, feature: "rag" },
    { path: ROUTES.memory, feature: "memory" },
    { path: ROUTES.agent, feature: "ai" },
    { path: ROUTES.observability, feature: "observability" },
] as const satisfies readonly FeatureRoute[];

export const ADMIN_ROUTES = [
    ROUTES.adminUsers,
    ROUTES.adminPlatform,
    ROUTES.adminSettings,
] as const;

