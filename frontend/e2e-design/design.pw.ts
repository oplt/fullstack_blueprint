import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const story = (name: string, theme: string) => `/iframe.html?id=blueprint-validation-design-system--${name}&viewMode=story&globals=theme:${theme};language:en`;
const widths = [320, 390, 640, 768, 1024, 1280, 1440, 1920];
const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
for (const theme of ["light", "dark"]) {
    for (const width of widths) {
        test(`${theme} gallery at ${width}px`, async ({ page }, info) => {
            await page.setViewportSize({ width, height: 1000 });
            await page.goto(story("gallery", theme));
            const gallery = page.getByTestId("design-gallery");
            await expect(gallery).toBeVisible();
            await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
            await page.evaluate(() => document.fonts.ready.then(() => undefined));
            await expect(page.getByTestId("dense-card")).toHaveCSS("padding-top", "12px");
            await expect(page.getByTestId("large-card")).toHaveCSS("padding-top", "32px");
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
            expect(overflow, "Page must not overflow horizontally").toBe(false);
            const control = page.getByRole("button", { name: "Continue", exact: true });
            await expect(control).toBeVisible();
            expect((await control.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
            await page.getByText("View data table").click();
            await expect(page.getByRole("table", { name: "Activity data" })).toBeVisible();
            const results = await new AxeBuilder({ page }).include("#storybook-root").withTags(tags).analyze();
            expect(results.violations).toEqual([]);
            // Always save evidence; comparisons require reviewed, committed baseline images.
            const screenshot = await gallery.screenshot({ animations: "disabled" });
            await info.attach(`${theme}-${width}.png`, { body: screenshot, contentType: "image/png" });
            if (process.env.VISUAL_COMPARE === "1") await expect(gallery).toHaveScreenshot(`${theme}-${width}.png`, { animations: "disabled" });
        });
    }
    test(`${theme} nested overlay keyboard and stacking`, async ({ page }) => {
        await page.goto(story("nested-overlay", theme));
        const trigger = page.getByRole("button", { name: "Open dialog" });
        await trigger.focus();
        await page.keyboard.press("Enter");
        const dialog = page.getByRole("dialog", { name: "Project settings" });
        await expect(dialog).toBeVisible();
        const details = dialog.getByRole("button", { name: "Open details" });
        await details.click();
        const nested = page.getByRole("button", { name: "Nested action" });
        await expect(nested).toBeVisible();
        // Trial click checks actual hit testing, not merely DOM visibility.
        await nested.click({ trial: true });
        await page.keyboard.press("Escape");
        await expect(nested).toBeHidden();
        await expect(dialog).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
        await expect(trigger).toBeFocused();
    });
}
