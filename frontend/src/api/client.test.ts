import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiFetch, apiFetchItems, apiFetchStream } from "./client";

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

    it("returns undefined for 204 responses and deduplicates concurrent refresh", async () => {
        const fetchMock = vi.fn().mockImplementation(async (url: string) => {
            if (url.endsWith("/auth/refresh")) return new Response(null, { status: 200 });
            if (url.endsWith("/auth/logout") && fetchMock.mock.calls.filter(([calledUrl]) => calledUrl === url).length > 1) {
                return new Response(null, { status: 204 });
            }
            if (fetchMock.mock.calls.filter(([calledUrl]) => calledUrl === url).length === 1) {
                return new Response(JSON.stringify({ detail: "expired" }), { status: 401 });
            }
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
        });
        vi.stubGlobal("fetch", fetchMock);

        await expect(apiFetch<void>("/auth/logout", { method: "POST" })).resolves.toBeUndefined();
        const results = await Promise.all([apiFetch("/projects"), apiFetch("/notifications")]);

        expect(results).toEqual([{ ok: true }, { ok: true }]);
        expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/auth/refresh"))).toHaveLength(2);
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

    it.each(["sign-in", "sign-up", "refresh"])("preserves a 401 on /auth/%s without recovery", async route => {
        const fetchMock = vi.fn().mockResolvedValue(new Response('{"detail":"denied"}', { status: 401 }));
        vi.stubGlobal("fetch", fetchMock);
        await expect(apiFetch("/auth/" + route)).rejects.toMatchObject({ status: 401, message: "denied" });
        expect(fetchMock).toHaveBeenCalledOnce();
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

    it("serializes rotating refreshes for independent clients sharing the cookie jar", async () => {
        vi.resetModules();
        const otherTab = await import("./client");
        let queue = Promise.resolve(true);
        const acquire = vi.fn((_name: string, run: () => Promise<boolean>) => {
            queue = queue.then(run);
            return queue;
        });
        vi.stubGlobal("navigator", { locks: { request: acquire } });
        const rotations: string[] = [];
        const pending = new Set(["/api/v1/projects", "/api/v1/notifications"]);
        let releaseFirst = () => {};
        const first = new Promise<void>(resolve => { releaseFirst = resolve; });
        vi.stubGlobal("fetch", async (url: string, options: RequestInit) => {
            if (pending.delete(url)) return new Response(null, { status: 401 });
            if (url.endsWith("/auth/refresh")) {
                rotations.push(new Headers(options.headers).get("X-CSRF-Token") ?? "");
                if (rotations.length === 1) await first;
                document.cookie = "blueprint_csrf=token" + rotations.length;
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
            expect(rotations).toEqual(["token0", "token1"]);
        } finally {
            releaseFirst();
            document.cookie = "blueprint_csrf=; Max-Age=0";
        }
    });
});
