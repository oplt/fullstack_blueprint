import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiFetch, apiFetchItems, apiFetchStream } from "@/lib/api";

describe("apiFetchItems", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("returns items without changing request behavior", async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({ items: [{ id: "item-1" }], total: 1, limit: 50, offset: 0 }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            )
        );
        vi.stubGlobal("fetch", fetchMock);

        const items = await apiFetchItems<{ id: string }>("/items");

        expect(items).toEqual([{ id: "item-1" }]);
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/v1/items",
            expect.objectContaining({ credentials: "include" })
        );
    });

    it("normalizes FastAPI validation errors with status and field messages", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ detail: [{ loc: ["body", "email"], msg: "Invalid email" }] }), {
                status: 422,
                headers: { "Content-Type": "application/json", "X-Correlation-ID": "corr-1" },
            })
        ));

        await expect(apiFetch("/auth/sign-in", { method: "POST", body: "{}" })).rejects.toMatchObject({
            status: 422,
            fieldErrors: { email: ["Invalid email"] },
            correlationId: "corr-1",
        } satisfies Partial<ApiError>);
    });

    it("returns undefined for a 204 response", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

        await expect(apiFetch<void>("/projects")).resolves.toBeUndefined();
    });

    it("returns successful non-JSON response bodies as text", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
            new Response("ready", { headers: { "Content-Type": "text/plain" } })
        ));

        await expect(apiFetch<string>("/health/live")).resolves.toBe("ready");
    });

    it("passes abort signals through without converting cancellation into an API error", async () => {
        const fetchMock = vi.fn((_url: string, options: RequestInit) => new Promise<Response>((_resolve, reject) => {
            options.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        }));
        vi.stubGlobal("fetch", fetchMock);
        const controller = new AbortController();
        const request = apiFetch("/projects", { signal: controller.signal });
        controller.abort();
        await expect(request).rejects.toMatchObject({ name: "AbortError" });
    });

    it("bounds stream authentication recovery to one refresh", async () => {
        const fetchMock = vi.fn().mockImplementation(async (url: string) => {
            if (url.endsWith("/auth/refresh")) return new Response(null, { status: 200 });
            return new Response(null, { status: 401 });
        });
        vi.stubGlobal("fetch", fetchMock);

        await expect(apiFetchStream("/ai/stream")).rejects.toMatchObject({ status: 401 });
        expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/auth/refresh"))).toHaveLength(1);
        expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/ai/stream"))).toHaveLength(2);
    });

    it("does not refresh or replay auth endpoints or unsafe mutations", async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response('{"detail":"expired"}', { status: 401 }));
        vi.stubGlobal("fetch", fetchMock);

        await expect(apiFetch("/auth/logout", { method: "POST" })).rejects.toMatchObject({ status: 401 });
        await expect(apiFetch("/projects", { method: "POST", body: "{}" })).rejects.toMatchObject({ status: 401 });

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock.mock.calls.every(([url]) => !String(url).endsWith("/auth/refresh"))).toBe(true);
    });

    it("still attempts rotation if the session probe fails", async () => {
        let firstProjectRequest = true;
        const fetchMock = vi.fn().mockImplementation(async (url: string) => {
            if (url.endsWith("/projects")) {
                if (firstProjectRequest) {
                    firstProjectRequest = false;
                    return new Response(null, { status: 401 });
                }
                return new Response('{"ok":true}', { headers: { "Content-Type": "application/json" } });
            }
            if (url.endsWith("/auth/me")) throw new Error("temporary network error");
            if (url.endsWith("/auth/refresh")) return new Response(null, { status: 204 });
            return new Response(null, { status: 500 });
        });
        vi.stubGlobal("fetch", fetchMock);

        await expect(apiFetch("/projects")).resolves.toEqual({ ok: true });
        expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/auth/refresh"))).toHaveLength(1);
    });

    it.each(["sign-in", "sign-up", "refresh"])("preserves a 401 on /auth/%s without recovery", async route => {
        const fetchMock = vi.fn().mockResolvedValue(new Response('{"detail":"denied"}', { status: 401 }));
        vi.stubGlobal("fetch", fetchMock);
        await expect(apiFetch("/auth/" + route)).rejects.toMatchObject({ status: 401, message: "denied" });
        expect(fetchMock).toHaveBeenCalledOnce();
    });

    it("does not refresh an anonymous session without a CSRF cookie", async () => {
        document.cookie = "blueprint_csrf=; Max-Age=0; Path=/";
        const fetchMock = vi.fn(async () => Response.json({ detail: "Authentication required" }, { status: 401 }));
        vi.stubGlobal("fetch", fetchMock);

        await expect(apiFetch("/auth/me")).rejects.toMatchObject({ status: 401 });

        expect(fetchMock).toHaveBeenCalledOnce();
        expect(fetchMock).toHaveBeenCalledWith("/api/v1/auth/me", expect.any(Object));
    });

    it("refreshes an expired session during bootstrap when the CSRF cookie exists", async () => {
        document.cookie = "blueprint_csrf=token; Path=/";
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response(null, { status: 401 }))
            .mockResolvedValueOnce(new Response(null, { status: 401 }))
            .mockResolvedValueOnce(new Response(null, { status: 204 }))
            .mockResolvedValueOnce(Response.json({ id: "user-1" }));
        vi.stubGlobal("fetch", fetchMock);

        try {
            await expect(apiFetch("/auth/me")).resolves.toEqual({ id: "user-1" });
            expect(fetchMock.mock.calls.filter(([url]) => url === "/api/v1/auth/refresh")).toHaveLength(1);
        } finally {
            document.cookie = "blueprint_csrf=; Max-Age=0; Path=/";
        }
    });

    it("preserves multipart boundaries and the original error when refresh fails", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(new Response('{"detail":"expired"}', { status: 401 }))
            .mockRejectedValueOnce(new Error("offline"));
        vi.stubGlobal("fetch", fetchMock);
        const body = new FormData();
        await expect(apiFetch("/upload", { method: "POST", body })).rejects.toMatchObject({ status: 401, message: "expired" });
        expect(fetchMock.mock.calls[0][1].headers.has("Content-Type")).toBe(false);
        expect(fetchMock.mock.calls[0][1].body).toBe(body);
    });

    it("does not replay a consumed request stream", async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
        vi.stubGlobal("fetch", fetchMock);
        await expect(apiFetchStream("/upload", { method: "POST", body: new ReadableStream() })).rejects.toMatchObject({ status: 401 });
        expect(fetchMock).toHaveBeenCalledOnce();
    });

    it.each(["bad%zz", "%0A"])("handles an invalid csrf cookie (%s) using the server response", async cookie => {
        document.cookie = "blueprint_csrf=" + cookie;
        const fetchMock = vi.fn().mockResolvedValue(new Response('{"detail":"Invalid CSRF token"}', { status: 403 }));
        vi.stubGlobal("fetch", fetchMock);
        try {
            await expect(apiFetch("/projects", { method: "POST" })).rejects.toMatchObject({ status: 403 });
            expect(fetchMock.mock.calls[0][1].headers.has("X-CSRF-Token")).toBe(false);
        } finally {
            document.cookie = "blueprint_csrf=; Max-Age=0";
        }
    });

    it("rechecks session state after acquiring the cross-tab refresh lock", async () => {
        vi.resetModules();
        const otherTab = await import("@/lib/api");
        let queue = Promise.resolve(true);
        const acquire = vi.fn((_name: string, run: () => Promise<boolean>) => {
            queue = queue.then(run);
            return queue;
        });
        vi.stubGlobal("navigator", { locks: { request: acquire } });
        const rotations: string[] = [];
        const pending = new Set(["/api/v1/projects", "/api/v1/notifications"]);
        let sessionActive = false;
        let releaseFirst = () => {};
        const first = new Promise<void>(resolve => { releaseFirst = resolve; });
        vi.stubGlobal("fetch", async (url: string, options: RequestInit) => {
            if (pending.delete(url)) return new Response(null, { status: 401 });
            if (url.endsWith("/auth/me")) {
                return new Response(null, { status: sessionActive ? 200 : 401 });
            }
            if (url.endsWith("/auth/refresh")) {
                rotations.push(new Headers(options.headers).get("X-CSRF-Token") ?? "");
                if (rotations.length === 1) await first;
                sessionActive = true;
                document.cookie = "blueprint_csrf=token1";
            }
            return new Response(null, { status: 204 });
        });
        document.cookie = "blueprint_csrf=token0";
        try {
            const requests = Promise.all([apiFetch("/projects"), otherTab.apiFetch("/notifications")]);
            await vi.waitFor(() => expect(acquire).toHaveBeenCalledTimes(2));
            expect(acquire.mock.calls.map(([name]) => name)).toEqual(["blueprint-auth-refresh", "blueprint-auth-refresh"]);
            expect(rotations).toEqual(["token0"]);
            releaseFirst();
            await requests;
            expect(rotations).toEqual(["token0"]);
        } finally {
            releaseFirst();
            document.cookie = "blueprint_csrf=; Max-Age=0";
        }
    });

    it("keeps a shared refresh alive when one waiting request is aborted", async () => {
        let releaseRefresh = () => {};
        const refreshBarrier = new Promise<void>(resolve => { releaseRefresh = resolve; });
        let refreshStarted = false;
        const initialRequests = new Set(["/api/v1/projects", "/api/v1/notifications"]);
        vi.stubGlobal("fetch", async (url: string) => {
            if (initialRequests.delete(url)) return new Response('{"detail":"expired"}', { status: 401 });
            if (url.endsWith("/auth/me")) return new Response(null, { status: 401 });
            if (url.endsWith("/auth/refresh")) {
                refreshStarted = true;
                await refreshBarrier;
                return new Response(null, { status: 204 });
            }
            return new Response('{"ok":true}', { headers: { "Content-Type": "application/json" } });
        });
        const controller = new AbortController();
        try {
            const abortedRequest = apiFetch("/projects", { signal: controller.signal });
            const survivingRequest = apiFetch("/notifications");
            await vi.waitFor(() => expect(refreshStarted).toBe(true));
            controller.abort();
            await expect(abortedRequest).rejects.toMatchObject({ name: "AbortError" });
            releaseRefresh();
            await expect(survivingRequest).resolves.toEqual({ ok: true });
        } finally {
            releaseRefresh();
        }
    });

    it("waits for an in-flight refresh before completing logout", async () => {
        vi.resetModules();
        const client = await import("@/lib/api");
        let queue = Promise.resolve(true);
        vi.stubGlobal("navigator", {
            locks: {
                request: vi.fn((_name: string, run: () => Promise<unknown>) => {
                    queue = queue.then(run) as Promise<boolean>;
                    return queue;
                }),
            },
        });
        let releaseRefresh = () => {};
        const refreshBarrier = new Promise<void>(resolve => { releaseRefresh = resolve; });
        let refreshStarted = false;
        let projectCalls = 0;
        vi.stubGlobal("fetch", async (url: string) => {
            if (url.endsWith("/projects")) {
                projectCalls += 1;
                return new Response('{"detail":"expired"}', { status: 401 });
            }
            if (url.endsWith("/auth/me")) return new Response(null, { status: 401 });
            if (url.endsWith("/auth/refresh")) {
                refreshStarted = true;
                await refreshBarrier;
                return new Response(null, { status: 204 });
            }
            if (url.endsWith("/auth/logout")) return new Response(null, { status: 204 });
            return new Response(null, { status: 500 });
        });
        try {
            const request = client.apiFetch("/projects");
            await vi.waitFor(() => expect(refreshStarted).toBe(true));
            const logout = client.apiFetch<void>("/auth/logout", { method: "POST" });
            releaseRefresh();
            await expect(logout).resolves.toBeUndefined();
            await expect(request).rejects.toMatchObject({ status: 401 });
            expect(projectCalls).toBe(1);
        } finally {
            releaseRefresh();
        }
    });

    it("recovers when Web Locks are unavailable and another tab wins rotation", async () => {
        vi.resetModules();
        const otherTab = await import("@/lib/api");
        vi.stubGlobal("navigator", { locks: undefined });
        const initialRequests = new Set(["/api/v1/projects", "/api/v1/notifications"]);
        let sessionActive = false;
        let meRequests = 0;
        let refreshRequests = 0;
        let releaseRefreshes = () => {};
        const refreshBarrier = new Promise<void>(resolve => { releaseRefreshes = resolve; });
        vi.stubGlobal("fetch", async (url: string) => {
            if (initialRequests.delete(url)) return new Response(null, { status: 401 });
            if (url.endsWith("/auth/me")) {
                meRequests += 1;
                const wasActive = sessionActive;
                if (meRequests === 2) releaseRefreshes();
                if (meRequests <= 2) await refreshBarrier;
                return new Response(null, { status: wasActive ? 200 : 401 });
            }
            if (url.endsWith("/auth/refresh")) {
                refreshRequests += 1;
                const attempt = refreshRequests;
                if (attempt <= 2) await refreshBarrier;
                if (attempt === 1) {
                    sessionActive = true;
                    document.cookie = "blueprint_csrf=token1";
                    return new Response(null, { status: 204 });
                }
                return new Response(null, { status: 401 });
            }
            return new Response('{"ok":true}', { headers: { "Content-Type": "application/json" } });
        });
        document.cookie = "blueprint_csrf=token0";

        await expect(Promise.all([
            apiFetch("/projects"),
            otherTab.apiFetch("/notifications"),
        ])).resolves.toEqual([{ ok: true }, { ok: true }]);
        expect(refreshRequests).toBe(2);
        expect(sessionActive).toBe(true);
        releaseRefreshes();
    });
});
