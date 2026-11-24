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
});
