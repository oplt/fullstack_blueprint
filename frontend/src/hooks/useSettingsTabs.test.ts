import { describe, expect, it } from "vitest";

import { getVisibleSettingsTabs } from "./useSettingsTabs";
import { createApplicationConfiguration } from "@/config/application/configuration";
import type { CapabilityId } from "@/config/application/types";

const paths = (isAdmin: boolean, hasUserPlatformModule: boolean, features: string[]) => {
    const featureCapabilities: Record<string, CapabilityId[]> = {
        ai: ["ai", "agent"], rag: ["rag"], memory: ["memory"],
        observability: ["observability"], notifications: ["notifications"],
    };
    const capabilities: CapabilityId[] = ["dashboard", "profile"];
    for (const feature of features) capabilities.push(...(featureCapabilities[feature] ?? []));
    if (hasUserPlatformModule) capabilities.push("platform");
    if (isAdmin) capabilities.push("admin");
    const configuration = createApplicationConfiguration({
        enabledCapabilities: capabilities,
        build: { enabledCapabilities: capabilities, source: "default" },
        deployment: { availableCapabilities: capabilities, environment: "test", source: "deployment" },
    });
    return getVisibleSettingsTabs({
        isAdmin, hasUserPlatformModule, features, configuration,
        server: { availableFeatures: features },
    }).map((tab) => tab.path);
};

describe("settings tab visibility", () => {
    it("keeps capability and admin tabs hidden for a basic user", () => {
        expect(paths(false, false, [])).toEqual(["/profile"]);
    });

    it("shows capability tabs independently", () => {
        expect(paths(false, true, [])).toContain("/platform");
        expect(paths(false, false, ["ai"])).toEqual(["/profile", "/ai", "/agent"]);
        expect(paths(false, false, ["rag", "memory"])).toEqual(["/profile", "/rag", "/memory"]);
    });

    it("shows notifications only when the capability is enabled", () => {
        expect(paths(false, false, [])).not.toContain("/notifications");
        expect(paths(false, false, ["notifications"])).toContain("/notifications");
    });

    it("shows all admin tabs only to admins", () => {
        const adminPaths = paths(true, true, ["ai"]);
        expect(adminPaths).toEqual(expect.arrayContaining([
            "/admin/settings",
            "/admin/users",
            "/admin/platform",
        ]));
        expect(paths(false, true, ["ai"]).some((path) => path.startsWith("/admin/"))).toBe(false);
    });
});
