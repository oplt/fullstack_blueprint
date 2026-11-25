const CSRF_COOKIE_NAME = import.meta.env.VITE_CSRF_COOKIE_NAME || "blueprint_csrf";
const CSRF_HEADER_NAME = import.meta.env.VITE_CSRF_HEADER_NAME || "X-CSRF-Token";
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
    const prefix = name + "=";
    const cookie = document.cookie.split(";").map(part => part.trim()).find(part => part.startsWith(prefix));
    if (!cookie) return null;
    try {
        const token = decodeURIComponent(cookie.slice(prefix.length));
        // The backend generates URL-safe tokens. An invalid cookie cannot authorize a write.
        return /^[A-Za-z0-9_-]+$/.test(token) ? token : null;
    } catch {
        return null;
    }
}

function request(path: string, options: RequestInit): Promise<Response> {
    const headers = new Headers(options.headers);
    if (typeof options.body === "string" && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }
    if (!headers.has(CSRF_HEADER_NAME)) {
        const token = readCookie(CSRF_COOKIE_NAME);
        if (token) headers.set(CSRF_HEADER_NAME, token);
    }
    return fetch(API_BASE + path, { ...options, headers, credentials: "include" });
}

async function refreshAccessToken(): Promise<boolean> {
    const refresh = async () => (await request("/auth/refresh", { method: "POST" })).ok;
    try {
        // Refresh rotates a single-use cookie. Serialize rotations across tabs.
        return navigator.locks ? await navigator.locks.request("blueprint-auth-refresh", refresh) : await refresh();
    } catch {
        return false;
    }
}

async function waitForRefresh(signal?: AbortSignal | null): Promise<boolean> {
    signal?.throwIfAborted();
    refreshPromise ??= refreshAccessToken().finally(() => { refreshPromise = null; });
    if (!signal) return refreshPromise;
    const pending = refreshPromise;
    return new Promise<boolean>((resolve, reject) => {
        const abort = () => reject(signal.reason);
        signal.addEventListener("abort", abort, { once: true });
        void pending.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
    });
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function validationMessage(item: unknown): string {
    return isRecord(item) && typeof item.msg === "string" ? item.msg : String(item);
}

function errorFields(payload: Record<string, unknown>) {
    const result: Record<string, string[]> = Object.create(null);
    if (isRecord(payload.errors)) {
        for (const [key, value] of Object.entries(payload.errors)) {
            if (Array.isArray(value)) result[key] = value.filter(item => typeof item === "string");
        }
    }
    if (!Array.isArray(payload.detail)) return result;
    for (const item of payload.detail) {
        if (!isRecord(item) || !("loc" in item)) continue;
        const key = Array.isArray(item.loc) ? item.loc.filter(part => part !== "body").join(".") : "form";
        (result[key] ??= []).push(validationMessage(item));
    }
    return result;
}

async function parseApiError(response: Response, signal?: AbortSignal | null): Promise<ApiError> {
    const json: unknown = await response.json().catch(() => undefined);
    signal?.throwIfAborted();
    const payload = isRecord(json) ? json : {};
    const detail = typeof payload.detail === "string" ? payload.detail
        : Array.isArray(payload.detail) ? payload.detail.map(validationMessage).join("; ") : "Request failed";
    const fieldErrors = errorFields(payload);
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
    const response = await apiFetchStream(path, options, retry);
    return response.status === 204 ? undefined as T : response.json();
}

const unauthenticatedRoutes = new Set([
    "/auth/sign-in", "/auth/sign-up", "/auth/refresh", "/auth/forgot-password",
    "/auth/reset-password", "/auth/verify-email", "/auth/resend-verification",
]);

function canRefreshRequest(path: string, options: RequestInit) {
    const route = path.split("?", 1)[0].replace(/\/$/, "");
    return !unauthenticatedRoutes.has(route) && !(options.body instanceof ReadableStream);
}

export async function apiFetchStream(path: string, options: RequestInit = {}, retry = true): Promise<Response> {
    let response = await request(path, options);
    if (response.status === 401 && retry && canRefreshRequest(path, options) && await waitForRefresh(options.signal)) {
        options.signal?.throwIfAborted();
        await response.body?.cancel();
        response = await request(path, options);
    }
    if (!response.ok) throw await parseApiError(response, options.signal);
    return response;
}

export async function apiFetchItems<T>(
    path: string,
    options: RequestInit = {}
): Promise<T[]> {
    const page = await apiFetch<Paginated<T>>(path, options);
    return page.items;
}
