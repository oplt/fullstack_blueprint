import { themePresets, type ThemePreset } from "../designTokens";
import { CAPABILITY_IDS, CAPABILITY_MANIFESTS } from "./capabilities";
import type {
    ApplicationConfiguration,
    ApplicationConfigurationInput,
    ApplicationPreset,
    BuildConfiguration,
    CapabilityId,
    ConfigurationSource,
    DeploymentConfiguration,
    LayoutVariant,
    NavigationEntry,
} from "./types";

const ALL_CAPABILITIES = [...CAPABILITY_IDS];
const CORE_CAPABILITIES: CapabilityId[] = ["dashboard", "projects", "profile", "notifications", "platform"];

export const PRESET_CAPABILITIES: Readonly<Record<ApplicationPreset, readonly CapabilityId[]>> = {
    minimal: CORE_CAPABILITIES,
    saas: [...CORE_CAPABILITIES, "calendar"],
    "ai-saas": [...CORE_CAPABILITIES, "calendar", "ai", "rag", "memory", "agent"],
    "knowledge-platform": [...CORE_CAPABILITIES, "ai", "rag", "memory"],
    "automation-platform": [...CORE_CAPABILITIES, "ai", "agent", "observability"],
    enterprise: ALL_CAPABILITIES,
    "internal-business": [...CORE_CAPABILITIES, "calendar", "observability"],
};

const PRESET_THEME: Readonly<Record<ApplicationPreset, ThemePreset>> = {
    minimal: "minimal-saas",
    saas: "minimal-saas",
    "ai-saas": "creative-ai",
    "knowledge-platform": "linear-inspired",
    "automation-platform": "linear-inspired",
    enterprise: "enterprise",
    "internal-business": "enterprise",
};

const defaultNavigation = Object.values(CAPABILITY_MANIFESTS)
    .flatMap((manifest) => manifest.navigation)
    .sort((left, right) => left.order - right.order);

const DEFAULT_LAYOUT_VARIANTS: Partial<Record<CapabilityId, LayoutVariant>> = {
    dashboard: "saas-dashboard",
    projects: "split-panel-workspace",
    calendar: "full-width-workspace",
    ai: "ai-conversation",
    rag: "split-panel-workspace",
    agent: "ai-conversation",
    profile: "settings",
    platform: "settings",
};

function uniqueCapabilities(capabilities: readonly CapabilityId[]): CapabilityId[] {
    return [...new Set(capabilities)].filter((capability) => CAPABILITY_IDS.includes(capability));
}

export function parseCapabilitySelection(value: string | undefined): CapabilityId[] | undefined {
    if (!value?.trim()) return undefined;
    const selected = uniqueCapabilities(value.split(",").map((item) => item.trim() as CapabilityId));
    return selected.length ? selected : undefined;
}

export function buildConfigurationForPreset(
    preset: ApplicationPreset,
    environment: Record<string, string | undefined> = typeof import.meta !== "undefined" ? import.meta.env : {},
): BuildConfiguration {
    const fromEnvironment = parseCapabilitySelection(environment.VITE_BLUEPRINT_CAPABILITIES);
    return {
        enabledCapabilities: fromEnvironment ?? [...PRESET_CAPABILITIES[preset]],
        source: fromEnvironment ? "environment" : "default",
    };
}

function deploymentConfigurationFor(
    capabilities: readonly CapabilityId[],
    environment: DeploymentConfiguration["environment"] = "custom",
    source: ConfigurationSource = "deployment",
): DeploymentConfiguration {
    return { availableCapabilities: uniqueCapabilities(capabilities), environment, source };
}

const DEFAULT_APPLICATION_CONFIGURATION: ApplicationConfiguration = {
    preset: "enterprise",
    appName: "Fullstack Blueprint",
    branding: {},
    themePreset: PRESET_THEME.enterprise,
    defaultLanguage: "en",
    navigation: defaultNavigation,
    enabledCapabilities: ALL_CAPABILITIES,
    layoutVariants: DEFAULT_LAYOUT_VARIANTS,
    build: { enabledCapabilities: ALL_CAPABILITIES, source: "default" },
    deployment: deploymentConfigurationFor(ALL_CAPABILITIES, "custom", "default"),
};

export function createApplicationConfiguration(input: ApplicationConfigurationInput = {}): ApplicationConfiguration {
    const preset = input.preset ?? DEFAULT_APPLICATION_CONFIGURATION.preset;
    const build = {
        ...buildConfigurationForPreset(preset),
        ...input.build,
        enabledCapabilities: uniqueCapabilities(input.build?.enabledCapabilities ?? buildConfigurationForPreset(preset).enabledCapabilities),
    };
    const enabledCapabilities = uniqueCapabilities(input.enabledCapabilities ?? build.enabledCapabilities);
    const deployment = {
        ...deploymentConfigurationFor(enabledCapabilities),
        ...input.deployment,
        availableCapabilities: uniqueCapabilities(input.deployment?.availableCapabilities ?? enabledCapabilities),
    };
    const navigation = input.navigation ?? defaultNavigation;
    return {
        ...DEFAULT_APPLICATION_CONFIGURATION,
        ...input,
        preset,
        themePreset: input.themePreset ?? PRESET_THEME[preset],
        navigation,
        enabledCapabilities,
        layoutVariants: { ...DEFAULT_LAYOUT_VARIANTS, ...input.layoutVariants },
        build,
        deployment,
    };
}

export function getConfiguredNavigation(configuration: ApplicationConfiguration): NavigationEntry[] {
    return configuration.navigation.filter((entry) => entry.placement === "primary" && configuration.enabledCapabilities.includes(entry.capability));
}

export function isThemePreset(value: string): value is ThemePreset {
    return (themePresets as readonly string[]).includes(value);
}
