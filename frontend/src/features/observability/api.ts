import { apiFetch, type ApiRequestOptions } from "@/lib/api";
import type { ObservabilityLinks, ObservabilityStatus } from "./types";

export function getObservabilityLinks(options?: ApiRequestOptions): Promise<ObservabilityLinks> {
    return apiFetch("/observability/links", options);
}

export function getObservabilityStatus(options?: ApiRequestOptions): Promise<ObservabilityStatus> {
    return apiFetch("/observability/status", options);
}
