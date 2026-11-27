import { defineConfig, devices } from "@playwright/test";

const port = process.env.DESIGN_PREVIEW_PORT ?? "6007";
if (!/^\d{1,5}$/.test(port) || Number(port) < 1024 || Number(port) > 65535) {
    throw new Error("DESIGN_PREVIEW_PORT must be an integer between 1024 and 65535.");
}
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
    testDir: "./e2e-design",
    testMatch: "**/*.pw.ts",
    timeout: 60_000,
    workers: 1,
    retries: 0,
    reporter: process.env.CI ? "github" : "html",
    outputDir: "test-results/design",
    use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure", reducedMotion: "reduce", ...devices["Desktop Chrome"] },
    projects: [{ name: "chromium" }],
    webServer: {
        command: `npm exec -- vite preview --outDir storybook-static --host 127.0.0.1 --port ${port} --strictPort`,
        url: `${baseURL}/iframe.html`,
        reuseExistingServer: false,
        timeout: 60_000,
    },
});
