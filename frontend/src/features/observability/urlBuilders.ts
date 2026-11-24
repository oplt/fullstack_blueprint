import type { GrafanaUrlContext } from "./types";

const DEFAULT_FROM = "now-1h";
const DEFAULT_TO = "now";
const DEFAULT_ORG_ID = "1";

function addParam(params: URLSearchParams, name: string, value?: string) {
    const trimmed = value?.trim();
    if (trimmed) {
        params.set(name, trimmed);
    }
}

export function buildGrafanaUrl(baseUrl: string | null | undefined, context: GrafanaUrlContext = {}) {
    if (!baseUrl) {
        return null;
    }

    let url: URL;
    try {
        url = new URL(baseUrl);
    } catch {
        return null;
    }
    if (!(["http:", "https:"] as string[]).includes(url.protocol)) return null;
    const params = url.searchParams;
    addParam(params, "orgId", context.orgId ?? DEFAULT_ORG_ID);
    addParam(params, "from", context.from ?? DEFAULT_FROM);
    addParam(params, "to", context.to ?? DEFAULT_TO);
    addParam(params, "var-service", context.service);
    addParam(params, "var-environment", context.environment);
    addParam(params, "var-route", context.route);
    addParam(params, "var-job", context.jobName);

    return url.toString();
}

export function buildTempoExploreUrl(baseUrl: string | null | undefined, context: GrafanaUrlContext = {}) {
    const url = buildGrafanaUrl(baseUrl, context);
    if (!url) {
        return null;
    }

    const withParams = new URL(url);
    addParam(withParams.searchParams, "traceId", context.traceId);
    addParam(withParams.searchParams, "requestId", context.requestId);
    return withParams.toString();
}

export function openExternalUrl(url: string) {
    try {
        const parsed = new URL(url, window.location.origin);
        if (!(parsed.protocol === "http:" || parsed.protocol === "https:")) return;
        window.open(url, "_blank", "noopener,noreferrer");
    } catch {
        // Invalid or unsafe operational links are ignored at the browser boundary.
    }
}
