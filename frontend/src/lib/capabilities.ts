import type {
    ApplicationConfiguration,
    CapabilityId,
    CapabilityAvailability,
    CapabilityRoute,
    NavigationEntry,
    ServerCapabilityState
} from "../app/configuration";
import type {PlatformMetadata} from "../features/platform/api";

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

type CoreCapabilityOptions = {
    id: CapabilityId;
    label: string;
    path: string;
    icon: NavigationEntry["icon"];
    order: number;
    translationKey: string;
};

function core({id, label, path, icon, order, translationKey}: CoreCapabilityOptions): CapabilityManifest {
    return {
        id,
        label,
        description: `${label} core capability.`,
        requiredDependencies: ["react", "react-router-dom"],
        optionalDependencies: [],
        routes: [{path}],
        navigation: [{id, capability: id, path, label, translationKey, icon, placement: "primary", order}],
        featureFlags: [],
        requiredPermissions: [],
        requiredEntitlements: [],
        requiredBackendEndpoints: [],
    };
}

export const CAPABILITY_MANIFESTS: Readonly<Record<CapabilityId, CapabilityManifest>> = {
    dashboard: {
        ...core({
            id: "dashboard",
            label: "Dashboard",
            path: "/dashboard",
            icon: "dashboard",
            order: 10,
            translationKey: "navigation.dashboard"
        }), featureFlags: ["beta_dashboard"]
    },
    projects: {
        ...core({
            id: "projects",
            label: "Projects",
            path: "/projects",
            icon: "projects",
            order: 20,
            translationKey: "navigation.projects",
        }),
        serverFeature: "projects",
    },
    profile: {
        ...core({
            id: "profile",
            label: "Profile",
            path: "/profile",
            icon: "profile",
            order: 10,
            translationKey: "navigation.profile"
        }),
        navigation: [{
            id: "profile",
            capability: "profile",
            path: "/profile",
            label: "Profile",
            translationKey: "navigation.profile",
            icon: "profile",
            placement: "settings",
            order: 10
        }],
    },
    notifications: {
        ...core({
            id: "notifications",
            label: "Notifications",
            path: "/notifications",
            icon: "notifications",
            order: 30,
            translationKey: "navigation.notifications"
        }),
        serverFeature: "notifications",
        navigation: [{
            id: "notifications",
            capability: "notifications",
            path: "/notifications",
            label: "Notifications",
            translationKey: "navigation.notifications",
            icon: "notifications",
            placement: "settings",
            order: 20
        }],
    },
    calendar: {
        ...core({
            id: "calendar",
            label: "Calendar",
            path: "/calendar",
            icon: "calendar",
            order: 30,
            translationKey: "navigation.calendar"
        }),
        serverFeature: "calendar",
        requiredBackendEndpoints: ["/api/v1/calendar/items"],
    },
    ai: {
        ...core({id: "ai", label: "AI Studio", path: "/ai", icon: "ai", order: 40, translationKey: "navigation.ai"}),
        backendModule: "ai",
        serverFeature: "ai",
        optionalDependencies: ["recharts"],
        requiredBackendEndpoints: ["/api/v1/ai"],
    },
    rag: {
        ...core({
            id: "rag",
            label: "Retrieval",
            path: "/rag",
            icon: "search",
            order: 50,
            translationKey: "navigation.retrieval"
        }),
        backendModule: "ai",
        serverFeature: "rag",
        requiredBackendEndpoints: ["/api/v1/rag"],
    },
    memory: {
        ...core({
            id: "memory",
            label: "Memory",
            path: "/memory",
            icon: "memory",
            order: 60,
            translationKey: "navigation.memory"
        }),
        serverFeature: "memory",
        requiredBackendEndpoints: ["/api/v1/memory"],
    },
    agent: {
        ...core({
            id: "agent",
            label: "Agent",
            path: "/agent",
            icon: "agent",
            order: 70,
            translationKey: "navigation.agent"
        }),
        backendModule: "ai",
        serverFeature: "ai",
        requiredBackendEndpoints: ["/api/v1/agent"],
    },
    observability: {
        ...core({
            id: "observability",
            label: "Observability",
            path: "/observability",
            icon: "observability",
            order: 80,
            translationKey: "navigation.observability"
        }),
        serverFeature: "observability",
        requiredBackendEndpoints: ["/api/v1/observability"],
    },
    platform: {
        ...core({
            id: "platform",
            label: "Platform",
            path: "/platform",
            icon: "platform",
            order: 90,
            translationKey: "navigation.settings"
        }),
        navigation: [{
            id: "platform",
            capability: "platform",
            path: "/platform",
            label: "Platform",
            translationKey: "navigation.settings",
            icon: "platform",
            placement: "settings",
            order: 30
        }],
        requiredBackendEndpoints: ["/api/v1/platform/metadata"],
    },
    admin: {
        ...core({
            id: "admin",
            label: "Administration",
            path: "/admin",
            icon: "admin",
            order: 100,
            translationKey: "navigation.settings"
        }),
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
    if (!metadata) return {availableFeatures: []};
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

type CapabilityConfiguration = Pick<ApplicationConfiguration, "build" | "deployment">;

function configurationReasons(capability: CapabilityId, configuration: CapabilityConfiguration): string[] {
    const reasons: string[] = [];
    if (!configuration.build.enabledCapabilities.includes(capability)) reasons.push("excluded by build selection");
    if (!configuration.deployment.availableCapabilities.includes(capability)) reasons.push("unavailable in deployment");
    return reasons;
}

function serverFeatureReasons(manifest: CapabilityManifest, server: ServerCapabilityState): string[] {
    if (manifest.serverFeature && server.availableFeatures && !server.availableFeatures.includes(manifest.serverFeature)) {
        return [`server feature ${manifest.serverFeature} is disabled`];
    }
    return [];
}

function backendModuleReasons(manifest: CapabilityManifest, server: ServerCapabilityState): string[] {
    if (!manifest.backendModule) return [];
    if (server.moduleCatalog?.length && !server.moduleCatalog.some((item) => item.key === manifest.backendModule && item.enabled)) {
        return [`backend module ${manifest.backendModule} is disabled`];
    }
    if (server.moduleCatalog?.length === 0 && server.enabledModules && !server.enabledModules.includes(manifest.backendModule)) {
        return [`backend module ${manifest.backendModule} is not enabled`];
    }
    return [];
}

function listRequirementReasons(
    values: readonly string[],
    available: readonly string[] | undefined,
    label: "runtime feature flag" | "permission" | "entitlement",
): string[] {
    if (!available) return [];
    return values.filter((value) => !available.includes(value)).map((value) => `${label} ${value} is ${label === "runtime feature flag" ? "disabled" : "missing"}`);
}

function endpointReasons(manifest: CapabilityManifest, server: ServerCapabilityState): string[] {
    if (!server.backendEndpoints) return [];
    return manifest.requiredBackendEndpoints
        .filter((endpoint) => !server.backendEndpoints?.some((available) => available === endpoint || available.startsWith(`${endpoint}/`)))
        .map((endpoint) => `backend endpoint ${endpoint} is unavailable`);
}

export function capabilityAvailability(
    capability: CapabilityId,
    configuration: CapabilityConfiguration,
    server: ServerCapabilityState = {},
): CapabilityAvailability {
    const manifest = getCapabilityManifest(capability);
    const reasons = [
        ...configurationReasons(capability, configuration),
        ...serverFeatureReasons(manifest, server),
        ...backendModuleReasons(manifest, server),
        ...listRequirementReasons(manifest.featureFlags, server.featureFlags ? Object.keys(server.featureFlags).filter((flag) => server.featureFlags?.[flag]) : undefined, "runtime feature flag"),
        ...listRequirementReasons(manifest.requiredPermissions, server.permissions, "permission"),
        ...listRequirementReasons(manifest.requiredEntitlements, server.entitlements, "entitlement"),
        ...endpointReasons(manifest, server),
    ];
    return {capability, available: reasons.length === 0, reasons};
}

export function visibleNavigation(
    navigation: readonly NavigationEntry[],
    configuration: Pick<import("../app/configuration").ApplicationConfiguration, "build" | "deployment">,
    server: ServerCapabilityState = {},
): NavigationEntry[] {
    return navigation
        .filter((entry) => capabilityAvailability(entry.capability, configuration, server).available)
        .sort((left, right) => left.order - right.order);
}
