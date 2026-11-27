import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const galleryStory = "blueprint-validation-design-system--gallery";
const overlayStory = "blueprint-validation-design-system--nested-overlay";
async function openStory(page: Page, story: string, theme: "light" | "dark" = "light") {
    await page.goto(`/iframe.html?id=${story}&viewMode=story&globals=theme:${theme}`);
    await page.locator("#storybook-root").waitFor();
    await page.evaluate(() => document.fonts.ready);
}

for (const theme of ["light", "dark"] as const) {
    test(`${theme} design gallery is accessible and visually stable`, async ({ page }) => {
        await openStory(page, galleryStory, theme);

        const accessibility = await new AxeBuilder({ page }).analyze();
        expect(accessibility.violations).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
        await expect(page).toHaveScreenshot(`design-gallery-${theme}.png`, { fullPage: true });
    });
}

test("design gallery remains contained on a narrow viewport", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await openStory(page, galleryStory);

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await expect(page).toHaveScreenshot("design-gallery-mobile.png", { fullPage: true });
});

test("nested overlays support keyboard interaction", async ({ page }) => {
    await openStory(page, overlayStory);

    const openDialog = page.getByRole("button", { name: "Open dialog" });
    await openDialog.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Project settings" })).toBeVisible();

    const openDetails = page.getByRole("button", { name: "Open details" });
    await openDetails.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Nested details")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByText("Nested details")).toBeHidden();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Project settings" })).toBeHidden();
});
