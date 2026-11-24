const CSRF_COOKIE_NAME = import.meta.env.VITE_CSRF_COOKIE_NAME || "blueprint_csrf";
const API_BASE = import.meta.env.VITE_API_BASE ?? "/api/v1";

let refreshPromise: Promise<boolean> | null = null;

export type ApiErrorDetails = {
    status: number;
    detail: string;
    fieldErrors: Record<string, string[]>;
    correlationId?: string;
};

export class ApiError extends Error {
    readonly status: number;
    readonly fieldErrors: Record<string, string[]>;
    readonly correlationId?: string;

    constructor(details: ApiErrorDetails) {
        super(details.detail);
        this.name = "ApiError";
        this.status = details.status;
        this.fieldErrors = details.fieldErrors;
        this.correlationId = details.correlationId;
    }
}

function readCookie(name: string): string | null {
    const match = document.cookie.match(
        new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}=([^;]*)`)
    );
    return match ? decodeURIComponent(match[1]) : null;
}

async function refreshAccessToken(): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
            method: "POST",
            credentials: "include",
            headers: buildCsrfHeaders(),
        });
        return res.ok;
    } catch {
        return false;
    }
}

function buildCsrfHeaders(): HeadersInit {
    const csrfToken = readCookie(CSRF_COOKIE_NAME);
    return csrfToken ? { "X-CSRF-Token": csrfToken } : {};
}

async function parseApiError(response: Response): Promise<ApiError> {
    const payload = await response.json().catch(() => undefined) as
        | { detail?: unknown; errors?: Record<string, string[]> }
        | undefined;
    const detail = typeof payload?.detail === "string"
        ? payload.detail
        : Array.isArray(payload?.detail)
          ? payload.detail.map((item) => typeof item === "object" && item && "msg" in item ? String(item.msg) : String(item)).join("; ")
          : "Request failed";
    const fieldErrors: Record<string, string[]> = { ...(payload?.errors ?? {}) };
    if (Array.isArray(payload?.detail)) {
        for (const item of payload.detail) {
            if (typeof item !== "object" || !item || !("loc" in item)) continue;
            const location = Array.isArray(item.loc) ? item.loc.filter((part: unknown) => part !== "body").join(".") : "form";
            const message = "msg" in item ? String(item.msg) : detail;
            fieldErrors[location] = [...(fieldErrors[location] ?? []), message];
        }
    }
    return new ApiError({
        status: response.status,
        detail,
        fieldErrors,
        correlationId: response.headers.get("X-Correlation-ID") ?? response.headers.get("X-Request-ID") ?? undefined,
    });
}

export type Paginated<T> = {
    items: T[];
    total: number;
    limit: number;
    offset: number;
};

/** Request options intentionally exposed to query functions for cancellation. */
export type ApiRequestOptions = Pick<RequestInit, "signal">;

export async function apiFetch<T>(
    path: string,
    options: RequestInit = {},
    retry = true
): Promise<T> {
    const headers = new Headers(options.headers ?? {});
    const isFormData = options.body instanceof FormData;

    if (!isFormData && options.body !== undefined && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }
    if (!headers.has("X-CSRF-Token")) {
        const csrfValue = readCookie(CSRF_COOKIE_NAME);
        if (csrfValue) {
            headers.set("X-CSRF-Token", csrfValue);
        }
    }

    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        credentials: "include",
    });

    if (response.status === 401 && retry) {
        // Deduplicate concurrent refresh attempts
        if (!refreshPromise) {
            refreshPromise = refreshAccessToken().finally(() => {
                refreshPromise = null;
            });
        }
        const refreshed = await refreshPromise;
        if (!refreshed) {
            throw new Error("Session expired. Please sign in again.");
        }
        return apiFetch<T>(path, options, false);
    }

    if (!response.ok) {
        throw await parseApiError(response);
    }

    // Handle 204 No Content
    if (response.status === 204) return undefined as T;

    return response.json();
}

export async function apiFetchStream(path: string, options: RequestInit = {}, retry = true): Promise<Response> {
    const headers = new Headers(options.headers ?? {});
    const isFormData = options.body instanceof FormData;
    if (!isFormData && options.body !== undefined && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }
    if (!headers.has("X-CSRF-Token")) {
        const csrfValue = readCookie(CSRF_COOKIE_NAME);
        if (csrfValue) headers.set("X-CSRF-Token", csrfValue);
    }
    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        credentials: "include",
    });
    if (response.status === 401 && retry) {
        if (!refreshPromise) refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null; });
        if (await refreshPromise) return apiFetchStream(path, options, false);
    }
    if (!response.ok) throw await parseApiError(response);
    return response;
}

export async function apiFetchItems<T>(
    path: string,
    options: RequestInit = {}
): Promise<T[]> {
    const page = await apiFetch<Paginated<T>>(path, options);
    return page.items;
}
