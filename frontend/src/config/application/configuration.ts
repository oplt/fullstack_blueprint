
import {
    CAPABILITY_IDS,
    CAPABILITY_MANIFESTS,
} from "./capabilities";

import type {
    ApplicationConfiguration,
    ApplicationConfigurationInput,
    CapabilityId,
    LayoutVariant,
    NavigationEntry,
} from "./types";

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
