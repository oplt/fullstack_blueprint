import { describe, expect, it } from "vitest";

import { ADMIN_ROUTES, FEATURE_ROUTES, ROUTES, projectPath } from "../lib/routes";
import {
    CAPABILITY_MANIFESTS,
    capabilityAvailability,
    visibleNavigation,
} from "../lib/capabilities";
import type { CapabilityId, NavigationEntry } from "../lib/configurationTypes";
import { parseEnumParam, parsePositiveIntParam, parseRequiredParam } from "./searchParams";

const ALL_CAPABILITIES = Object.keys(CAPABILITY_MANIFESTS) as CapabilityId[];

function configuration(overrides: {
    enabled?: CapabilityId[];
    available?: CapabilityId[];
} = {}) {
    return {
        build: {
            enabledCapabilities: overrides.enabled ?? ALL_CAPABILITIES,
            source: "default" as const,
        },
        deployment: {
            availableCapabilities: overrides.available ?? ALL_CAPABILITIES,
            environment: "test" as const,
            source: "default" as const,
        },
    };
}

function featureRouteOwner(path: string) {
    return Object.entries(CAPABILITY_MANIFESTS).find(([, manifest]) =>
        manifest.routes.some((entry) => entry.path === path)
    );
}

describe("route contract", () => {
    it("keeps canonical paths and safely builds project deep links", () => {
        expect(ROUTES.dashboard).toBe("/dashboard");
        expect(projectPath("project/one")).toBe("/projects/project%2Fone");
        expect(projectPath("  ")).toBe(ROUTES.projects);
        expect(FEATURE_ROUTES.map((route) => route.path)).toContain(ROUTES.rag);
        expect(ADMIN_ROUTES).toEqual([ROUTES.adminUsers, ROUTES.adminPlatform, ROUTES.adminSettings]);
    });
});

describe("capability gating", () => {
    it("gates on build selection and deployment availability", () => {
        const buildExcluded = configuration({
            enabled: ALL_CAPABILITIES.filter((capability) => capability !== "rag"),
        });
        expect(capabilityAvailability("rag", buildExcluded, {}).reasons)
            .toContain("excluded by build selection");

        const deploymentExcluded = configuration({
            available: ALL_CAPABILITIES.filter((capability) => capability !== "rag"),
        });
        expect(capabilityAvailability("rag", deploymentExcluded, {}).reasons)
            .toContain("unavailable in deployment");
    });

    it("gates on server feature and backend module state", () => {
        expect(capabilityAvailability("calendar", configuration(), { availableFeatures: [] }).reasons)
            .toContain("server feature calendar is disabled");
        expect(capabilityAvailability("ai", configuration(), {
            availableFeatures: ["ai"],
            moduleCatalog: [{ key: "ai", enabled: false }],
        }).reasons).toContain("backend module ai is disabled");
    });

    it("matches required backend endpoints with prefix support", () => {
        expect(capabilityAvailability("calendar", configuration(), {
            availableFeatures: ["calendar"],
            backendEndpoints: ["/api/v1/calendar/items"],
        }).available).toBe(true);
        expect(capabilityAvailability("calendar", configuration(), {
            availableFeatures: ["calendar"],
            backendEndpoints: ["/api/v1/calendar/items/events"],
        }).available).toBe(true);
        expect(capabilityAvailability("calendar", configuration(), {
            availableFeatures: ["calendar"],
            backendEndpoints: ["/api/v1/calendar"],
        }).available).toBe(false);
    });

    it("requires the admin permission for admin routes", () => {
        expect(capabilityAvailability("admin", configuration(), { permissions: [] }).reasons)
            .toContain("permission platform:admin is missing");
    });

    it("keeps feature routes aligned with their capability manifests", () => {
        for (const route of FEATURE_ROUTES) {
            const owner = featureRouteOwner(route.path);
            expect(owner).toBeDefined();
            expect(owner?.[1].serverFeature).toBe(route.feature);
        }
    });

    it("filters and orders navigation by capability availability", () => {
        const navigation: NavigationEntry[] = [
            {
                id: "rag",
                capability: "rag",
                path: ROUTES.rag,
                label: "Retrieval",
                icon: "search",
                placement: "primary",
                order: 20,
            },
            {
                id: "calendar",
                capability: "calendar",
                path: ROUTES.calendar,
                label: "Calendar",
                icon: "calendar",
                placement: "primary",
                order: 10,
            },
        ];

        const visible = visibleNavigation(navigation, configuration(), {
            availableFeatures: ["calendar"],
        });

        expect(visible.map((entry) => entry.id)).toEqual(["calendar"]);
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
