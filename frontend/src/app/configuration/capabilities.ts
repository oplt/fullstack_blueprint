import type { CapabilityId, CapabilityAvailability, CapabilityRoute, NavigationEntry, ServerCapabilityState } from "./types";
import type { PlatformMetadata } from "../../api/platform";

export type CapabilityManifest = {
    id: CapabilityId;
    label: string;
    description: string;
    requiredDependencies: readonly string[];
    optionalDependencies: readonly string[];
    routes: readonly CapabilityRoute[];
    navigation: readonly NavigationEntry[];
    featureFlags: readonly string[];
    requiredPermissions: readonly string[];
    requiredEntitlements: readonly string[];
    requiredBackendEndpoints: readonly string[];
    backendModule?: string;
    serverFeature?: string;
};

const core = (id: CapabilityId, label: string, path: string, icon: NavigationEntry["icon"], order: number, translationKey: string): CapabilityManifest => ({
    id,
    label,
    description: `${label} core capability.`,
    requiredDependencies: ["react", "react-router-dom"],
    optionalDependencies: [],
    routes: [{ path }],
    navigation: [{ id, capability: id, path, label, translationKey, icon, placement: "primary", order }],
    featureFlags: [],
    requiredPermissions: [],
    requiredEntitlements: [],
    requiredBackendEndpoints: [],
});

export const CAPABILITY_MANIFESTS: Readonly<Record<CapabilityId, CapabilityManifest>> = {
    dashboard: { ...core("dashboard", "Dashboard", "/dashboard", "dashboard", 10, "navigation.dashboard"), featureFlags: ["beta_dashboard"] },
    projects: core("projects", "Projects", "/projects", "projects", 20, "navigation.projects"),
    profile: {
        ...core("profile", "Profile", "/profile", "profile", 10, "navigation.profile"),
        navigation: [{ id: "profile", capability: "profile", path: "/profile", label: "Profile", translationKey: "navigation.profile", icon: "profile", placement: "settings", order: 10 }],
    },
    notifications: {
        ...core("notifications", "Notifications", "/notifications", "notifications", 30, "navigation.notifications"),
        navigation: [{ id: "notifications", capability: "notifications", path: "/notifications", label: "Notifications", translationKey: "navigation.notifications", icon: "notifications", placement: "settings", order: 20 }],
    },
    calendar: {
        ...core("calendar", "Calendar", "/calendar", "calendar", 30, "navigation.calendar"),
        serverFeature: "calendar",
        requiredBackendEndpoints: ["/api/v1/calendar/items"],
    },
    ai: {
        ...core("ai", "AI Studio", "/ai", "ai", 40, "navigation.ai"),
        backendModule: "ai",
        serverFeature: "ai",
        optionalDependencies: ["recharts"],
        requiredBackendEndpoints: ["/api/v1/ai"],
    },
    rag: {
        ...core("rag", "Retrieval", "/rag", "search", 50, "navigation.retrieval"),
        backendModule: "ai",
        serverFeature: "rag",
        requiredBackendEndpoints: ["/api/v1/rag"],
    },
    memory: {
        ...core("memory", "Memory", "/memory", "memory", 60, "navigation.memory"),
        serverFeature: "memory",
        requiredBackendEndpoints: ["/api/v1/memory"],
    },
    agent: {
        ...core("agent", "Agent", "/agent", "agent", 70, "navigation.agent"),
        backendModule: "ai",
        serverFeature: "ai",
        requiredBackendEndpoints: ["/api/v1/agent"],
    },
    observability: {
        ...core("observability", "Observability", "/observability", "observability", 80, "navigation.observability"),
        serverFeature: "observability",
        requiredBackendEndpoints: ["/api/v1/observability"],
    },
    platform: {
        ...core("platform", "Platform", "/platform", "platform", 90, "navigation.settings"),
        navigation: [{ id: "platform", capability: "platform", path: "/platform", label: "Platform", translationKey: "navigation.settings", icon: "platform", placement: "settings", order: 30 }],
        requiredBackendEndpoints: ["/api/v1/platform/metadata"],
    },
    admin: {
        ...core("admin", "Administration", "/admin", "admin", 100, "navigation.settings"),
        navigation: [],
        requiredPermissions: ["platform:admin"],
        requiredBackendEndpoints: ["/api/v1/platform/admin"],
    },
};

export const CAPABILITY_IDS = Object.keys(CAPABILITY_MANIFESTS) as CapabilityId[];

export const BACKEND_MODULE_KEYS = [
    "ai",
    "billing",
    "api_keys",
    "webhooks",
    "feature_flags",
    "email_templates",
] as const;

export const BACKEND_MODULE_PACK_KEYS = [
    "lean_saas",
    "automation_suite",
    "client_portal",
    "full_platform",
] as const;

function getCapabilityManifest(capability: CapabilityId): CapabilityManifest {
    return CAPABILITY_MANIFESTS[capability];
}

export function serverStateFromPlatformMetadata(metadata?: PlatformMetadata | null): ServerCapabilityState {
    if (!metadata) return { availableFeatures: [] };
    return {
        availableFeatures: metadata.available_features,
        enabledModules: metadata.enabled_modules,
        moduleCatalog: metadata.module_catalog,
        featureFlags: metadata.feature_flags,
        permissions: metadata.permissions,
        entitlements: metadata.entitlements,
        backendEndpoints: metadata.backend_endpoints,
    };
}

export function capabilityAvailability(
    capability: CapabilityId,
    configuration: Pick<import("./types").ApplicationConfiguration, "build" | "deployment">,
    server: ServerCapabilityState = {},
): CapabilityAvailability {
    const manifest = getCapabilityManifest(capability);
    const reasons: string[] = [];
    if (!configuration.build.enabledCapabilities.includes(capability)) reasons.push("excluded by build selection");
    if (!configuration.deployment.availableCapabilities.includes(capability)) reasons.push("unavailable in deployment");
    if (manifest.serverFeature && server.availableFeatures && !server.availableFeatures.includes(manifest.serverFeature)) {
        reasons.push(`server feature ${manifest.serverFeature} is disabled`);
    }
    if (manifest.backendModule && server.moduleCatalog?.length && !server.moduleCatalog.some((item) => item.key === manifest.backendModule && item.enabled)) {
        reasons.push(`backend module ${manifest.backendModule} is disabled`);
    }
    if (manifest.backendModule && server.moduleCatalog?.length === 0 && server.enabledModules && !server.enabledModules.includes(manifest.backendModule)) {
        reasons.push(`backend module ${manifest.backendModule} is not enabled`);
    }
    for (const flag of manifest.featureFlags) {
        if (server.featureFlags && !server.featureFlags[flag]) reasons.push(`runtime feature flag ${flag} is disabled`);
    }
    for (const permission of manifest.requiredPermissions) {
        if (server.permissions && !server.permissions.includes(permission)) reasons.push(`permission ${permission} is missing`);
    }
    for (const entitlement of manifest.requiredEntitlements) {
        if (server.entitlements && !server.entitlements.includes(entitlement)) reasons.push(`entitlement ${entitlement} is missing`);
    }
    if (manifest.requiredBackendEndpoints.length && server.backendEndpoints) {
        for (const endpoint of manifest.requiredBackendEndpoints) {
            if (!server.backendEndpoints.some((available) => available === endpoint || available.startsWith(`${endpoint}/`))) {
                reasons.push(`backend endpoint ${endpoint} is unavailable`);
            }
        }
    }
    return { capability, available: reasons.length === 0, reasons };
}

export function visibleNavigation(
    navigation: readonly NavigationEntry[],
    configuration: Pick<import("./types").ApplicationConfiguration, "build" | "deployment">,
    server: ServerCapabilityState = {},
): NavigationEntry[] {
    return navigation
        .filter((entry) => capabilityAvailability(entry.capability, configuration, server).available)
        .sort((left, right) => left.order - right.order);
}
