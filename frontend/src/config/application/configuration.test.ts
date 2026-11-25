import { describe, expect, it } from "vitest";
import {
    BACKEND_MODULE_KEYS,
    BACKEND_MODULE_PACK_KEYS,
    CAPABILITY_IDS,
    capabilityAvailability,
} from "./capabilities";
import { createApplicationConfiguration } from "./configuration";

describe("blueprint application configuration", () => {
    it("keeps capability identifiers and backend module packs stable", () => {
        expect(CAPABILITY_IDS).toContain("observability");
        expect(BACKEND_MODULE_KEYS).toEqual(["ai", "billing", "api_keys", "webhooks", "feature_flags", "email_templates"]);
        expect(BACKEND_MODULE_PACK_KEYS).toEqual(["lean_saas", "automation_suite", "client_portal", "full_platform"]);
    });

    it("gates optional capabilities against server availability", () => {
        const configuration = createApplicationConfiguration();
        for (const capability of ["ai", "rag", "agent", "memory", "calendar", "notifications"] as const) {
            expect(capabilityAvailability(capability, configuration, { availableFeatures: [] }).available).toBe(false);
        }
        expect(capabilityAvailability("notifications", configuration, { availableFeatures: ["notifications"] }).available).toBe(true);
        expect(capabilityAvailability("ai", configuration, { availableFeatures: ["ai"], enabledModules: ["ai"] }).available).toBe(true);
    });

    it("respects disabled runtime feature flags", () => {
        const configuration = createApplicationConfiguration();
        expect(capabilityAvailability("dashboard", configuration, { featureFlags: { beta_dashboard: false } }).reasons)
            .toContain("runtime feature flag beta_dashboard is disabled");
    });
});
