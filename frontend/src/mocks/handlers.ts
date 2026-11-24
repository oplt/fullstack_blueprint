import { http, HttpResponse } from "msw";

/** Deterministic Storybook-only API fixtures. These handlers are never imported by production entrypoints. */
export const handlers = [
    http.get("*/api/v1/platform/metadata", () => HttpResponse.json({ app_name: "Blueprint Stories", core_domain_plural: "Projects", available_features: ["calendar", "ai", "rag", "memory", "observability"], module_catalog: [] })),
    http.get("*/api/v1/auth/me", () => HttpResponse.json({ id: "story-user", email: "stories@example.test", full_name: "Story User", is_admin: false })),
    http.get("*/api/v1/projects", () => HttpResponse.json([{ id: "story-project", name: "Storybook project", description: "Deterministic fixture" }])),
];
