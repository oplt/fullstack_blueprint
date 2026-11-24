import { chromium } from "@playwright/test";

const baseUrl = process.env.PWA_BASE_URL ?? "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

try {
  const response = await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  if (!response || response.status() !== 200) throw new Error(`PWA root returned ${response?.status() ?? "no response"}`);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.getRegistration("/")), null, { timeout: 15_000 });
  await page.reload({ waitUntil: "networkidle" });
  const state = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration("/");
    const cacheNames = await caches.keys();
    const apiCaches = await Promise.all(cacheNames.map(async (name) => (await caches.open(name)).keys()));
    return {
      manifest: await fetch("/manifest.webmanifest").then((item) => item.ok),
      serviceWorker: await fetch("/sw.js").then((item) => item.ok),
      registered: Boolean(registration),
      active: registration?.active?.state === "activated",
      controlled: Boolean(navigator.serviceWorker.controller),
      updateCapable: typeof registration?.update === "function",
      apiCacheEntries: apiCaches.flat().filter((request) => new URL(request.url).pathname.startsWith("/api/")).length,
    };
  });
  if (!state.manifest || !state.serviceWorker || !state.registered || !state.active || !state.controlled || !state.updateCapable) {
    throw new Error(`PWA registration check failed: ${JSON.stringify(state)}`);
  }
  if (state.apiCacheEntries !== 0) throw new Error(`PWA cached ${state.apiCacheEntries} API entries`);

  await context.setOffline(true);
  const offlinePage = await context.newPage();
  const offline = await offlinePage.goto(`${baseUrl}/reset-password`, { waitUntil: "domcontentloaded" });
  if (!offline || offline.status() !== 200) throw new Error(`Offline navigation returned ${offline?.status() ?? "no response"}`);
  console.log(JSON.stringify({ ...state, offlineResetPassword: offline.status() }, null, 2));
} finally {
  await browser.close();
}
