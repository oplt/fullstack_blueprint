import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("registers, signs in, refreshes, manages a project and signs out", async ({ page, context }) => {
    const email = `blueprint-${randomUUID()}@example.com`;
    const password = "Blueprint-test-password-28!";
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

    await page.getByRole("button", { name: "Cycle color theme" }).click();
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
