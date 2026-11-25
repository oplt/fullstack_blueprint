import type { LayoutVariant } from "@/config/application/types";
import type { CapabilityId } from "@/config/application/types";

export type { LayoutVariant } from "@/config/application/types";

export function layoutVariantForPath(pathname: string, overrides: Partial<Record<CapabilityId, LayoutVariant>> = {}): LayoutVariant {
    if (pathname === "/" || pathname.startsWith("/pricing") || pathname.startsWith("/about")) {
        return "public-marketing";
    }
    if (
        pathname.startsWith("/login") ||
        pathname.startsWith("/register") ||
        pathname.startsWith("/reset-password") ||
        pathname.startsWith("/verify-email")
    ) {
        return "authentication";
    }
    if (pathname.startsWith("/ai") || pathname.startsWith("/agent")) return overrides[pathname.startsWith("/agent") ? "agent" : "ai"] ?? "ai-conversation";
    if (pathname.startsWith("/projects/")) return overrides.projects ?? "split-panel-workspace";
    if (pathname.startsWith("/rag")) return overrides.rag ?? "split-panel-workspace";
    if (pathname.startsWith("/profile") || pathname.startsWith("/platform") || pathname.startsWith("/admin")) return overrides[pathname.startsWith("/profile") ? "profile" : "platform"] ?? "settings";
    if (pathname.startsWith("/calendar") || pathname.startsWith("/notifications")) return overrides[pathname.startsWith("/calendar") ? "calendar" : "notifications"] ?? "full-width-workspace";
    return "saas-dashboard";
}

export function layoutContentClass(variant: LayoutVariant): string {
    if (variant === "full-width-workspace" || variant === "split-panel-workspace" || variant === "ai-conversation") {
        return "w-full px-3 py-4 sm:px-5 sm:py-6";
    }
    if (variant === "settings") return "mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-6 sm:py-6";
    return "mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-6 sm:py-6";
}
