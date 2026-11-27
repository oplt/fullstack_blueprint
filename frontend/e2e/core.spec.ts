import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("registers, signs in, manages a workspace and signs out", async ({ page, context }) => {
    const email = `blueprint-${randomUUID()}@example.com`;
    const password = "Blueprint-test-password-28!";
    const apiBaseUrl = process.env.E2E_API_URL ?? "http://localhost:8000";
    const unexpectedErrors: string[] = [];
    page.on("pageerror", (error) => unexpectedErrors.push(error.message));
    page.on("response", (response) => {
        if (response.status() >= 500) unexpectedErrors.push(response.url());
    });

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/$/);
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    const form = page.locator("form").first();
    await form.getByLabel("Full name").fill("Blueprint Test");
    await form.getByLabel("Email", { exact: true }).fill(email);
    await form.getByLabel("Password", { exact: true }).fill(password);
    await form.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText(/you can sign in shortly/i)).toBeVisible();

    await form.getByLabel("Email", { exact: true }).fill(email);
    await form.getByLabel("Password", { exact: true }).fill(password);
    await form.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeAttached();

    const csrfCookieName = process.env.E2E_CSRF_COOKIE ?? "blueprint_csrf";
    const csrfCookie = (await context.cookies(apiBaseUrl)).find(({ name }) => name === csrfCookieName);
    expect(csrfCookie).toBeDefined();
    const csrfHeaders = { "X-CSRF-Token": csrfCookie?.value ?? "" };
    const organizationSlug = `workspace-${randomUUID()}`;
    const organization = await context.request.post(`${apiBaseUrl}/api/v1/organizations`, {
        data: { name: "Template workspace", slug: organizationSlug },
        headers: csrfHeaders,
    });
    expect(organization).toBeOK();
    await expect(organization.json()).resolves.toMatchObject({ slug: organizationSlug });

    const subscription = await context.request.put(`${apiBaseUrl}/api/v1/platform/billing/subscription`, {
        data: { plan_code: "free" },
        headers: csrfHeaders,
    });
    expect(subscription).toBeOK();
    await expect(subscription.json()).resolves.toMatchObject({ plan: { code: "free" } });

    const entitlement = await context.request.get(`${apiBaseUrl}/api/v1/platform/entitlements/core_access`);
    expect(entitlement).toBeOK();
    await expect(entitlement.json()).resolves.toEqual({ key: "core_access", enabled: true });

    await page.getByLabel(/^language$/i).selectOption("fr");
    await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe("fr");
    await page.getByRole("combobox", { name: "Langue" }).selectOption("en");
    await page.getByRole("combobox", { name: /^Theme:/ }).selectOption("dark");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Open navigation menu" }).click();
    await page.getByRole("link", { name: "Projects", exact: true }).click();
    await expect(page).toHaveURL(/\/projects$/);
    await page.getByRole("button", { name: "New project" }).first().click();
    await page.getByLabel("Project name").fill("Blueprint example");
    await page.getByRole("button", { name: "Create Project", exact: true }).click();
    await expect(page.getByText("Blueprint example", { exact: true })).toBeVisible();

    await context.clearCookies({ name: process.env.E2E_ACCESS_COOKIE ?? "blueprint_access" });
    const refreshed = page.waitForResponse(
        (response) => response.url().endsWith("/auth/refresh") && response.ok()
    );
    await page.reload();
    await refreshed;
    await expect(page.getByText("Blueprint example", { exact: true })).toBeVisible();

    await page.goto("/profile");
    await expect(page.getByRole("tab", { name: "Profile" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "AI Studio" })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "Users" })).toHaveCount(0);
    await page.goto("/ai");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole("button", { name: "Open navigation menu" }).click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/$/);
    expect(unexpectedErrors).toEqual([]);
});
