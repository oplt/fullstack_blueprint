import { expect, test, type Browser } from "@playwright/test";

const email = process.env.E2E_TEST_EMAIL;
const password = process.env.E2E_TEST_PASSWORD;
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const apiBaseUrl = process.env.E2E_API_URL ?? "http://localhost:8000";
const viewports = [
    { name: "mobile", width: 360, height: 800 },
    { name: "tablet", width: 768, height: 900 },
    { name: "desktop", width: 1440, height: 1000 },
] as const;
const pages = [
    ["dashboard", "/dashboard"],
    ["ai studio", "/ai"],
    ["rag", "/rag"],
    ["agents", "/agent"],
    ["calendar", "/calendar"],
    ["projects", "/projects"],
    ["profile", "/profile"],
    ["notifications", "/notifications"],
    ["observability", "/observability"],
] as const;

async function authenticatedPage(browser: Browser) {
    const context = await browser.newContext();
    const signIn = await context.request.post(`${apiBaseUrl}/api/v1/auth/sign-in`, {
        data: { email, password },
    });
    expect(signIn.ok()).toBeTruthy();
    return { context, page: await context.newPage() };
}

async function authenticatedAdminPage(browser: Browser) {
    const context = await browser.newContext();
    const signIn = await context.request.post(`${apiBaseUrl}/api/v1/auth/sign-in`, {
        data: { email: adminEmail, password: adminPassword },
    });
    expect(signIn.ok()).toBeTruthy();
    return { context, page: await context.newPage() };
}

test.describe("application responsive design", () => {
    test.skip(!email || !password, "Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD");

    for (const [name, path] of pages) {
        test(`${name} stays contained across themes and content widths`, async ({ browser }) => {
            const { context, page } = await authenticatedPage(browser);
            for (const theme of ["light", "dark"] as const) {
                await page.addInitScript(({ theme }) => {
                    localStorage.setItem("fullstack-blueprint.theme", JSON.stringify({ colorMode: theme }));
                    localStorage.setItem("fullstack-blueprint.language", "nl");
                }, { theme });
                for (const viewport of viewports) {
                    await page.setViewportSize(viewport);
                    await page.goto(path);
                    await expect(page.locator("main")).toBeVisible();
                    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
                }
            }
            await context.close();
        });
    }
});

test.describe("administration responsive design", () => {
    test.skip(!adminEmail || !adminPassword, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD");

    for (const path of ["/admin/settings", "/admin/platform", "/admin/users"] as const) {
        test(`${path} stays contained at compact widths`, async ({ browser }) => {
            const { context, page } = await authenticatedAdminPage(browser);
            await page.setViewportSize(viewports[0]);
            await page.goto(path);
            await expect(page.locator("main")).toBeVisible();
            await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
            await context.close();
        });
    }
});
