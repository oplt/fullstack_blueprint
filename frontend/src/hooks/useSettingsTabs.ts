import { useMemo } from "react";

import { useAuth } from "./useAuth";
import { usePlatformMetadata } from "./usePlatformMetadata";
import { ROUTES } from "../app/routes";
import { capabilityAvailability, serverStateFromPlatformMetadata } from "../app/configuration/capabilities";
import { useApplicationConfiguration } from "../app/configuration/useConfiguration";
import type { CapabilityId } from "../app/configuration/types";

export type SettingsTab = {
    label: string;
    path: string;
};

type SettingsTabDefinition = SettingsTab & {
    requiresPlatformModule?: boolean;
    feature?: string;
    adminOnly?: boolean;
    capability?: CapabilityId;
};

const NO_FEATURES: readonly string[] = [];

const SETTINGS_TAB_DEFINITIONS: SettingsTabDefinition[] = [
    { label: "Profile", path: ROUTES.profile },
    { label: "Platform", path: ROUTES.platform, requiresPlatformModule: true },
    { label: "AI Studio", path: ROUTES.ai, feature: "ai", capability: "ai" },
    { label: "Retrieval diagnostics", path: ROUTES.rag, feature: "rag", capability: "rag" },
    { label: "Memory", path: ROUTES.memory, feature: "memory", capability: "memory" },
    { label: "Agent", path: ROUTES.agent, feature: "ai", capability: "agent" },
    { label: "Observability", path: ROUTES.observability, feature: "observability", capability: "observability" },
    { label: "Settings", path: ROUTES.adminSettings, adminOnly: true, capability: "admin" },
    { label: "Users", path: ROUTES.adminUsers, adminOnly: true, capability: "admin" },
    { label: "Platform Admin", path: ROUTES.adminPlatform, adminOnly: true, capability: "admin" },
];

export function getVisibleSettingsTabs({
    isAdmin,
    hasUserPlatformModule,
    features,
    configuration,
    server,
}: {
    isAdmin: boolean;
    hasUserPlatformModule: boolean;
    features: readonly string[];
    configuration?: Parameters<typeof capabilityAvailability>[1];
    server?: Parameters<typeof capabilityAvailability>[2];
}): SettingsTab[] {
    return SETTINGS_TAB_DEFINITIONS.filter((item) => {
        if (item.adminOnly && !isAdmin) return false;
        if (item.requiresPlatformModule && !hasUserPlatformModule) return false;
        if (item.feature && !features.includes(item.feature)) return false;
        if (item.capability && configuration && !capabilityAvailability(item.capability, configuration, server).available) return false;
        return true;
    });
}

export function useSettingsTabs(): SettingsTab[] {
    const { isAdmin } = useAuth();
    const { data: platformMetadata } = usePlatformMetadata();
    const configuration = useApplicationConfiguration();
    const hasUserPlatformModule =
        platformMetadata?.module_catalog.some((item) => item.user_visible && item.enabled) ?? false;
    const features = platformMetadata?.available_features ?? NO_FEATURES;

    return useMemo(
        () => getVisibleSettingsTabs({ isAdmin, hasUserPlatformModule, features, configuration, server: serverStateFromPlatformMetadata(platformMetadata) }),
        [configuration, features, hasUserPlatformModule, isAdmin, platformMetadata]
    );
}

export function getActiveSettingsTab(
    pathname: string,
    tabs: SettingsTab[]
): SettingsTab | undefined {
    return [...tabs]
        .sort((left, right) => right.path.length - left.path.length)
        .find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));
}

export function isSettingsHubPath(pathname: string, tabs: SettingsTab[]): boolean {
    return getActiveSettingsTab(pathname, tabs) !== undefined;
}

export function getSettingsHubLabel(
    pathname: string,
    tabs: SettingsTab[]
): string | undefined {
    return getActiveSettingsTab(pathname, tabs)?.label;
}
