import { describe, expect, it } from "vitest";

import { getVisibleSettingsTabs } from "./useSettingsTabs";

const paths = (isAdmin: boolean, hasUserPlatformModule: boolean, features: string[]) =>
    getVisibleSettingsTabs({ isAdmin, hasUserPlatformModule, features }).map((tab) => tab.path);

describe("settings tab visibility", () => {
    it("keeps capability and admin tabs hidden for a basic user", () => {
        expect(paths(false, false, [])).toEqual(["/profile"]);
    });

    it("shows capability tabs independently", () => {
        expect(paths(false, true, [])).toContain("/platform");
        expect(paths(false, false, ["ai"])).toEqual(["/profile", "/ai", "/agent"]);
        expect(paths(false, false, ["rag", "memory"])).toEqual(["/profile", "/rag", "/memory"]);
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
