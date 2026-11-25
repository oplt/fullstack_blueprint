import { describe, expect, it } from "vitest";

import { ADMIN_ROUTES, FEATURE_ROUTES, ROUTES, projectPath } from "@/config/routes";
import { parseEnumParam, parsePositiveIntParam, parseRequiredParam } from "./searchParams";

describe("route contract", () => {
    it("keeps canonical paths and safely builds project deep links", () => {
        expect(ROUTES.dashboard).toBe("/dashboard");
        expect(projectPath("project/one")).toBe("/projects/project%2Fone");
        expect(projectPath("  ")).toBe(ROUTES.projects);
        expect(FEATURE_ROUTES.map((route) => route.path)).toContain(ROUTES.rag);
        expect(ADMIN_ROUTES).toEqual([ROUTES.adminUsers, ROUTES.adminPlatform, ROUTES.adminSettings]);
    });
});

describe("search parameter parsing", () => {
    it("accepts known values, aliases legacy values, and falls back safely", () => {
        const tabs = ["documents", "history"] as const;
        expect(parseEnumParam("history", tabs, "documents")).toBe("history");
        expect(parseEnumParam("queries", tabs, "documents", { queries: "history" })).toBe("history");
        expect(parseEnumParam("unknown", tabs, "documents")).toBe("documents");
    });

    it("bounds numeric and required values", () => {
        expect(parsePositiveIntParam("12", 0, { max: 20 })).toBe(12);
        expect(parsePositiveIntParam("21", 0, { max: 20 })).toBe(0);
        expect(parsePositiveIntParam("-1", 3)).toBe(3);
        expect(parseRequiredParam(" token ")).toBe("token");
        expect(parseRequiredParam(" ")).toBeNull();
    });
});
