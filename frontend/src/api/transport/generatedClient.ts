import { client as heyClient } from "../generated/hey/client.gen";
import { apiFetchStream } from "../client";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api/v1";

async function fetchThroughBlueprintTransport(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const request = input instanceof Request ? input : new Request(input, init);
    const url = new URL(request.url, typeof window === "undefined" ? "http://localhost" : window.location.origin);
    const prefix = url.pathname.startsWith(API_BASE) ? API_BASE : "/api/v1";
    const path = `${url.pathname.slice(prefix.length)}${url.search}`;
    const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.clone().arrayBuffer();
    return apiFetchStream(path, {
        method: request.method,
        headers: request.headers,
        body,
        signal: request.signal,
    });
}

/**
 * Hey API's generated SDK is configured at this boundary so all future typed
 * operations share the existing cookie/CSRF transport. Feature code should use
 * this client or the domain adapters, never store access tokens locally.
 */
export const generatedClient = heyClient;

generatedClient.setConfig({
    baseUrl: typeof window === "undefined" ? "" : window.location.origin,
    credentials: "include",
    fetch: fetchThroughBlueprintTransport,
});
