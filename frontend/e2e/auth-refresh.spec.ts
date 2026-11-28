import { expect, test } from "@playwright/test";

test("tabs sharing a cookie jar reuse the completed refresh", async ({ browser }, testInfo) => {
    const baseURL = String(testInfo.project.use.baseURL ?? "http://127.0.0.1:5173");
    const context = await browser.newContext();
    await context.addCookies([{ name: "blueprint_csrf", value: "initial", url: baseURL }]);

    let activeSession = false;
    let refreshCount = 0;
    const firstRefreshEntered = deferred();
    const secondResourceEntered = deferred();
    const releaseRefresh = deferred();
    const firstRequests = new Set(["/api/v1/projects", "/api/v1/notifications"]);

    await context.route("**/api/v1/**", async route => {
        const pathname = new URL(route.request().url()).pathname;
        if (pathname.endsWith("/auth/me")) {
            return route.fulfill({ status: activeSession ? 200 : 401 });
        }
        if (pathname.endsWith("/auth/refresh")) {
            refreshCount += 1;
            firstRefreshEntered.resolve();
            await releaseRefresh.promise;
            activeSession = true;
            return route.fulfill({
                status: 204,
                headers: { "Set-Cookie": "blueprint_csrf=rotated; Path=/; SameSite=Lax" },
            });
        }
        if (pathname.endsWith("/projects") || pathname.endsWith("/notifications")) {
            if (firstRequests.delete(pathname)) {
                if (pathname.endsWith("/notifications")) secondResourceEntered.resolve();
                return route.fulfill({ status: 401, contentType: "application/json", body: "{}" });
            }
            return route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
        }
        return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });

    try {
        const firstTab = await context.newPage();
        const secondTab = await context.newPage();
        await Promise.all([
            firstTab.goto(new URL("/manifest.webmanifest", baseURL).href),
            secondTab.goto(new URL("/manifest.webmanifest", baseURL).href),
        ]);
        const firstRequest = firstTab.evaluate(async () => {
            const clientPath = "/src/lib/api.ts";
            const client = await import(clientPath);
            return client.apiFetch("/projects");
        });
        await firstRefreshEntered.promise;
        const secondRequest = secondTab.evaluate(async () => {
            const clientPath = "/src/lib/api.ts";
            const client = await import(clientPath);
            return client.apiFetch("/notifications");
        });
        await secondResourceEntered.promise;
        expect(refreshCount).toBe(1);
        releaseRefresh.resolve();

        await expect(Promise.all([firstRequest, secondRequest])).resolves.toEqual([
            { ok: true },
            { ok: true },
        ]);
        expect(refreshCount).toBe(1);
    } finally {
        releaseRefresh.resolve();
        await context.close();
    }
});

function deferred() {
    let resolve!: () => void;
    const promise = new Promise<void>(done => { resolve = done; });
    return { promise, resolve };
}
