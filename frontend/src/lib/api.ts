const CSRF_COOKIE_NAME = import.meta.env.VITE_CSRF_COOKIE_NAME || "blueprint_csrf";
const CSRF_HEADER_NAME = import.meta.env.VITE_CSRF_HEADER_NAME || "X-CSRF-Token";
const API_BASE = import.meta.env.VITE_API_BASE ?? "/api/v1";

let refreshPromise: Promise<boolean> | null = null;
const REFRESH_LOCK_NAME = "blueprint-auth-refresh";
let authGeneration = 0;
let logoutInProgress = false;

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

function cancelBody(response: Response): Promise<void> {
    return response.body?.cancel().catch(() => undefined) ?? Promise.resolve();
}

async function hasActiveSession(): Promise<boolean> {
    const response = await request("/auth/me", { method: "GET", cache: "no-store" });
    const active = response.ok;
    await cancelBody(response);
    return active;
}

function browserLocks(): LockManager | undefined {
    return typeof navigator !== "undefined" ? navigator.locks : undefined;
}

async function refreshAccessToken(expectedGeneration: number): Promise<boolean> {
    const initialCsrfToken = readCookie(CSRF_COOKIE_NAME);
    const refresh = async () => {
        if (logoutInProgress || expectedGeneration !== authGeneration) return false;
        if (await hasActiveSession().catch(() => false)) return true;
        if (logoutInProgress || expectedGeneration !== authGeneration) return false;
        if (initialCsrfToken !== readCookie(CSRF_COOKIE_NAME)) return false;

        const response = await request("/auth/refresh", { method: "POST" });
        const refreshed = response.ok;
        await cancelBody(response);
        if (logoutInProgress || expectedGeneration !== authGeneration) return false;
        return refreshed || await hasActiveSession();
    };
    try {
        const locks = browserLocks();
        return locks ? await locks.request(REFRESH_LOCK_NAME, refresh) : await refresh();
    } catch {
        return false;
    }
}

async function waitForRefresh(signal?: AbortSignal | null): Promise<boolean> {
    signal?.throwIfAborted();
    if (logoutInProgress) return false;
    const expectedGeneration = authGeneration;
    refreshPromise ??= refreshAccessToken(expectedGeneration).finally(() => { refreshPromise = null; });
    if (!signal) return refreshPromise;
    const pending = refreshPromise;
    return new Promise<boolean>((resolve, reject) => {
        const cleanup = () => signal.removeEventListener("abort", abort);
        const abort = () => {
            cleanup();
            reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
        };
        signal.addEventListener("abort", abort, { once: true });
        if (signal.aborted) {
            abort();
            return;
        }
        void pending.then(
            value => { cleanup(); resolve(value); },
            error => { cleanup(); reject(error); },
        );
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
    const body = await response.text().catch(() => "");
    signal?.throwIfAborted();
    let json: unknown;
    try {
        json = body ? JSON.parse(body) : undefined;
    } catch {
        json = undefined;
    }
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
    if (response.status === 204) return undefined as T;
    const body = await response.text();
    if (!body.trim()) return undefined as T;
    const contentType = response.headers.get("Content-Type")?.toLowerCase() ?? "";
    if (!contentType.includes("/json") && !contentType.includes("+json")) return body as T;
    return JSON.parse(body) as T;
}

function canRefreshRequest(path: string, options: RequestInit) {
    const route = path.split("?", 1)[0].replace(/\/$/, "");
    const isReadableStream = typeof ReadableStream !== "undefined" && options.body instanceof ReadableStream;
    if (isReadableStream) return false;
    if (route === "/auth/me") return Boolean(readCookie(CSRF_COOKIE_NAME));
    if (route.startsWith("/auth/")) return false;

    const method = (options.method ?? "GET").toUpperCase();
    return method === "GET" || method === "HEAD";
}

function isLogoutRequest(path: string): boolean {
    return path.split("?", 1)[0].replace(/\/$/, "") === "/auth/logout";
}

async function requestLogout(path: string, options: RequestInit): Promise<Response> {
    authGeneration += 1;
    logoutInProgress = true;
    try {
        const sendLogout = () => request(path, options);
        const locks = browserLocks();
        if (locks) return await locks.request(REFRESH_LOCK_NAME, sendLogout);
        if (refreshPromise) await refreshPromise;
        return await sendLogout();
    } finally {
        logoutInProgress = false;
    }
}

async function retryAfterRefresh(
    response: Response,
    path: string,
    options: RequestInit,
): Promise<Response> {
    let originalError: ApiError;
    try {
        originalError = await parseApiError(response.clone(), options.signal);
    } finally {
        await cancelBody(response);
    }
    const requestGeneration = authGeneration;
    if (
        !await waitForRefresh(options.signal)
        || requestGeneration !== authGeneration
        || logoutInProgress
    ) {
        throw originalError;
    }
    options.signal?.throwIfAborted();
    return request(path, options);
}

export async function apiFetchStream(path: string, options: RequestInit = {}, retry = true): Promise<Response> {
    let response = isLogoutRequest(path) ? await requestLogout(path, options) : await request(path, options);
    if (response.status === 401 && retry && canRefreshRequest(path, options)) {
        response = await retryAfterRefresh(response, path, options);
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
