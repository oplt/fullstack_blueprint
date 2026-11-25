import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "./useAuth";
import { usePlatformMetadata } from "./usePlatformMetadata";
import { ROUTES } from "@/config/routes";
import { capabilityAvailability, serverStateFromPlatformMetadata } from "@/config/application/capabilities";
import { useApplicationConfiguration } from "@/config/application/useConfiguration";
import type { CapabilityId } from "@/config/application/types";

export type SettingsTab = {
    label: string;
    path: string;
    translationKey?: string;
};

type SettingsTabDefinition = Omit<SettingsTab, "label"> & {
    translationKey: string;
    requiresPlatformModule?: boolean;
    feature?: string;
    adminOnly?: boolean;
    capability?: CapabilityId;
};

const NO_FEATURES: readonly string[] = [];

const SETTINGS_TAB_DEFINITIONS: SettingsTabDefinition[] = [
    { translationKey: "navigation.profile", path: ROUTES.profile, capability: "profile" },
    { translationKey: "navigation.platform", path: ROUTES.platform, requiresPlatformModule: true, capability: "platform" },
    { translationKey: "navigation.ai", path: ROUTES.ai, feature: "ai", capability: "ai" },
    { translationKey: "navigation.retrieval", path: ROUTES.rag, feature: "rag", capability: "rag" },
    { translationKey: "navigation.memory", path: ROUTES.memory, feature: "memory", capability: "memory" },
    { translationKey: "navigation.agent", path: ROUTES.agent, feature: "ai", capability: "agent" },
    { translationKey: "navigation.observability", path: ROUTES.observability, feature: "observability", capability: "observability" },
    { translationKey: "navigation.notifications", path: ROUTES.notifications, capability: "notifications" },
    { translationKey: "navigation.adminSettings", path: ROUTES.adminSettings, adminOnly: true, capability: "admin" },
    { translationKey: "navigation.users", path: ROUTES.adminUsers, adminOnly: true, capability: "admin" },
    { translationKey: "navigation.platformAdmin", path: ROUTES.adminPlatform, adminOnly: true, capability: "admin" },
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
}): SettingsTabDefinition[] {
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
    const { t } = useTranslation();
    const { data: platformMetadata } = usePlatformMetadata();
    const configuration = useApplicationConfiguration();
    const hasUserPlatformModule =
        platformMetadata?.module_catalog.some((item) => item.user_visible && item.enabled) ?? false;
    const features = platformMetadata?.available_features ?? NO_FEATURES;

    return useMemo(
        () => getVisibleSettingsTabs({ isAdmin, hasUserPlatformModule, features, configuration, server: serverStateFromPlatformMetadata(platformMetadata) })
            .map((item) => ({ path: item.path, label: t(item.translationKey) })),
        [configuration, features, hasUserPlatformModule, isAdmin, platformMetadata, t]
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

export function getSettingsHubLabel(
    pathname: string,
    tabs: SettingsTab[]
): string | undefined {
    return getActiveSettingsTab(pathname, tabs)?.label;
}
