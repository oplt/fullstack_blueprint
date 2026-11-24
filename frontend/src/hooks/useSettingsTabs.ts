import { useMemo } from "react";

import { useAuth } from "./useAuth";
import { usePlatformMetadata } from "./usePlatformMetadata";

export type SettingsTab = {
    label: string;
    path: string;
};

type SettingsTabDefinition = SettingsTab & {
    requiresPlatformModule?: boolean;
    feature?: string;
    adminOnly?: boolean;
};

const NO_FEATURES: readonly string[] = [];

const SETTINGS_TAB_DEFINITIONS: SettingsTabDefinition[] = [
    { label: "Profile", path: "/profile" },
    { label: "Platform", path: "/platform", requiresPlatformModule: true },
    { label: "AI Studio", path: "/ai", feature: "ai" },
    { label: "Retrieval diagnostics", path: "/rag", feature: "rag" },
    { label: "Memory", path: "/memory", feature: "memory" },
    { label: "Agent", path: "/agent", feature: "ai" },
    { label: "Observability", path: "/observability", feature: "observability" },
    { label: "Settings", path: "/admin/settings", adminOnly: true },
    { label: "Users", path: "/admin/users", adminOnly: true },
    { label: "Platform Admin", path: "/admin/platform", adminOnly: true },
];

export function getVisibleSettingsTabs({
    isAdmin,
    hasUserPlatformModule,
    features,
}: {
    isAdmin: boolean;
    hasUserPlatformModule: boolean;
    features: readonly string[];
}): SettingsTab[] {
    return SETTINGS_TAB_DEFINITIONS.filter((item) => {
        if (item.adminOnly && !isAdmin) return false;
        if (item.requiresPlatformModule && !hasUserPlatformModule) return false;
        if (item.feature && !features.includes(item.feature)) return false;
        return true;
    });
}

export function useSettingsTabs(): SettingsTab[] {
    const { isAdmin } = useAuth();
    const { data: platformMetadata } = usePlatformMetadata();
    const hasUserPlatformModule =
        platformMetadata?.module_catalog.some((item) => item.user_visible && item.enabled) ?? false;
    const features = platformMetadata?.available_features ?? NO_FEATURES;

    return useMemo(
        () => getVisibleSettingsTabs({ isAdmin, hasUserPlatformModule, features }),
        [features, hasUserPlatformModule, isAdmin]
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
