import { describe, expect, it } from "vitest";
import {
    BACKEND_MODULE_KEYS,
    BACKEND_MODULE_PACK_KEYS,
    CAPABILITY_IDS,
    capabilityAvailability,
} from "./capabilities";
import {
    PRESET_CAPABILITIES,
    buildConfigurationForPreset,
    createApplicationConfiguration,
    parseCapabilitySelection,
} from "./configuration";

describe("blueprint application configuration", () => {
    it("defines the supported product presets and preserves backend pack identifiers", () => {
        expect(PRESET_CAPABILITIES.minimal).toContain("dashboard");
        expect(PRESET_CAPABILITIES["ai-saas"]).toEqual(expect.arrayContaining(["ai", "rag", "memory"]));
        expect(BACKEND_MODULE_KEYS).toEqual(["ai", "billing", "api_keys", "webhooks", "feature_flags", "email_templates"]);
        expect(BACKEND_MODULE_PACK_KEYS).toEqual(["lean_saas", "automation_suite", "client_portal", "full_platform"]);
    });

    it("separates build selection from deployment availability and server state", () => {
        const configuration = createApplicationConfiguration({
            preset: "enterprise",
            build: { enabledCapabilities: ["dashboard", "ai"], source: "generator" },
            deployment: { availableCapabilities: ["dashboard", "ai"], environment: "staging", source: "deployment" },
        });
        expect(capabilityAvailability("ai", configuration, { availableFeatures: ["ai"], enabledModules: ["ai"] }).available).toBe(true);
        expect(capabilityAvailability("rag", configuration, { availableFeatures: ["rag"] }).available).toBe(false);
        expect(capabilityAvailability("ai", configuration, { availableFeatures: [], enabledModules: ["ai"] }).reasons).toContain("server feature ai is disabled");
        expect(capabilityAvailability("dashboard", configuration, { featureFlags: { beta_dashboard: false } }).reasons).toContain("runtime feature flag beta_dashboard is disabled");
    });

    it("parses generator capability overrides without accepting unknown ids", () => {
        expect(parseCapabilitySelection("dashboard,ai,unknown,ai")).toEqual(["dashboard", "ai"]);
        expect(parseCapabilitySelection(" ")).toBeUndefined();
        const generated = buildConfigurationForPreset("minimal", { VITE_BLUEPRINT_CAPABILITIES: "dashboard,projects" });
        expect(generated.source).toBe("environment");
        expect(generated.enabledCapabilities).toEqual(["dashboard", "projects"]);
        expect(CAPABILITY_IDS).toContain("observability");
    });
});
