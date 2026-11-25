
/** Stable identifiers used by product presets and generated applications. */
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


export type ConfigurationSource = "default" | "environment" | "generator" | "deployment";
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

/** Build-time choices are owned by the generated frontend build. */
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
