import type { LayoutVariant, CapabilityId } from "@/lib/configurationTypes";
export type { LayoutVariant } from "@/lib/configurationTypes";

type LayoutRule = { prefix: string; variant: LayoutVariant; capability?: CapabilityId };
const rules: readonly LayoutRule[] = [
    { prefix: "/pricing", variant: "public-marketing" },
    { prefix: "/about", variant: "public-marketing" },
    { prefix: "/login", variant: "authentication" },
    { prefix: "/register", variant: "authentication" },
    { prefix: "/reset-password", variant: "authentication" },
    { prefix: "/verify-email", variant: "authentication" },
    { prefix: "/ai", variant: "ai-conversation", capability: "ai" },
    { prefix: "/agent", variant: "ai-conversation", capability: "agent" },
    { prefix: "/projects/", variant: "split-panel-workspace", capability: "projects" },
    { prefix: "/rag", variant: "split-panel-workspace", capability: "rag" },
    { prefix: "/profile", variant: "settings", capability: "profile" },
    { prefix: "/platform", variant: "settings", capability: "platform" },
    { prefix: "/admin", variant: "settings", capability: "platform" },
    { prefix: "/calendar", variant: "full-width-workspace", capability: "calendar" },
    { prefix: "/notifications", variant: "full-width-workspace", capability: "notifications" },
];
export function layoutVariantForPath(pathname: string, overrides: Partial<Record<CapabilityId, LayoutVariant>> = {}): LayoutVariant {
    if (pathname === "/") return "public-marketing";
    const rule = rules.find(({ prefix }) => pathname.startsWith(prefix));
    if (!rule) return "saas-dashboard";
    return rule.capability ? overrides[rule.capability] ?? rule.variant : rule.variant;
}
export function layoutContentClass(variant: LayoutVariant): string {
    const fluid = ["full-width-workspace", "split-panel-workspace", "ai-conversation"].includes(variant);
    return fluid ? "ui-layout-content ui-layout-content-fluid" : "ui-layout-content";
}
