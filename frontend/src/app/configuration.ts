import { createContext, useContext } from "react";

import {
    CAPABILITY_IDS,
    CAPABILITY_MANIFESTS,
} from "@/lib/capabilities";

/** Stable identifiers used by runtime capability configuration. */
export type CapabilityId =
    | "dashboard"
    | "projects"
    | "calendar"
    | "ai"
    | "rag"
    | "memory"
    | "agent"
    | "observability"
    | "platform"
    | "profile"
    | "notifications"
    | "admin";

export type ConfigurationSource = "default" | "environment" | "deployment";
export type LayoutVariant =
    | "saas-dashboard"
    | "full-width-workspace"
    | "split-panel-workspace"
    | "authentication"
    | "settings"
    | "public-marketing"
    | "ai-conversation";

type NavigationPlacement = "primary" | "settings";
export type NavigationIcon =
    | "dashboard"
    | "projects"
    | "calendar"
    | "ai"
    | "search"
    | "memory"
    | "agent"
    | "observability"
    | "platform"
    | "profile"
    | "notifications"
    | "admin";

export type NavigationEntry = {
    id: string;
    capability: CapabilityId;
    path: string;
    label: string;
    translationKey?: string;
    icon: NavigationIcon;
    placement: NavigationPlacement;
    order: number;
    adminOnly?: boolean;
};

export type CapabilityRoute = {
    path: string;
    feature?: string;
    adminOnly?: boolean;
};

/** Build-time choices are owned by this frontend build. */
export type BuildConfiguration = {
    enabledCapabilities: readonly CapabilityId[];
    source: ConfigurationSource;
};

/** Deployment availability is an operational choice, not a user permission. */
export type DeploymentConfiguration = {
    availableCapabilities: readonly CapabilityId[];
    environment: "development" | "test" | "staging" | "production" | "custom";
    source: ConfigurationSource;
};

type BrandingConfiguration = {
    logo?: string;
    logoAlt?: string;
    favicon?: string;
};

export type ApplicationConfiguration = {
    appName: string;
    branding: BrandingConfiguration;
    defaultLanguage: "en" | "nl" | "fr";
    navigation: readonly NavigationEntry[];
    enabledCapabilities: readonly CapabilityId[];
    layoutVariants: Partial<Record<CapabilityId, LayoutVariant>>;
    build: BuildConfiguration;
    deployment: DeploymentConfiguration;
};

export type ApplicationConfigurationInput = Partial<
    Pick<
        ApplicationConfiguration,
        "appName" |
        "branding" |
        "defaultLanguage" |
        "layoutVariants"
    >
>;

export type ServerCapabilityState = {
    availableFeatures?: readonly string[];
    enabledModules?: readonly string[];
    moduleCatalog?: readonly { key: string; enabled: boolean }[];
    featureFlags?: Readonly<Record<string, boolean>>;
    permissions?: readonly string[];
    entitlements?: readonly string[];
    backendEndpoints?: readonly string[];
};

export type CapabilityAvailability = {
    capability: CapabilityId;
    available: boolean;
    reasons: readonly string[];
};

const ALL_CAPABILITIES: readonly CapabilityId[] = [
    ...CAPABILITY_IDS,
];

const DEFAULT_NAVIGATION = Object.values(
    CAPABILITY_MANIFESTS,
)
    .flatMap((manifest) => manifest.navigation)
    .sort((left, right) => left.order - right.order);

const DEFAULT_LAYOUT_VARIANTS: Partial<
    Record<CapabilityId, LayoutVariant>
> = {
    dashboard: "saas-dashboard",
    projects: "split-panel-workspace",
    calendar: "full-width-workspace",
    ai: "ai-conversation",
    rag: "split-panel-workspace",
    agent: "ai-conversation",
    profile: "settings",
    platform: "settings",
};

export function createApplicationConfiguration(
    input: ApplicationConfigurationInput = {},
): ApplicationConfiguration {
    return {
        appName: "Fullstack Blueprint",
        branding: {},
        defaultLanguage: "en",

        ...input,

        navigation: DEFAULT_NAVIGATION,

        enabledCapabilities: ALL_CAPABILITIES,

        layoutVariants: {
            ...DEFAULT_LAYOUT_VARIANTS,
            ...input.layoutVariants,
        },

        build: {
            enabledCapabilities: ALL_CAPABILITIES,
            source: "default",
        },

        deployment: {
            availableCapabilities: ALL_CAPABILITIES,
            environment: "custom",
            source: "default",
        },
    };
}

export function getConfiguredNavigation(
    configuration: ApplicationConfiguration,
): NavigationEntry[] {
    return configuration.navigation.filter(
        (entry) => entry.placement === "primary",
    );
}

const defaultApplicationConfiguration: ApplicationConfiguration = createApplicationConfiguration();

export const ApplicationConfigurationContext = createContext<ApplicationConfiguration>(defaultApplicationConfiguration);

export function useApplicationConfiguration(): ApplicationConfiguration {
    return useContext(ApplicationConfigurationContext);
}
