import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const dist = resolve(process.cwd(), "dist");
const required = ["index.html", "manifest.webmanifest", "sw.js", "registerSW.js"];
for (const file of required) {
  if (!existsSync(resolve(dist, file))) throw new Error(`Missing PWA artifact: ${file}`);
}
const manifest = JSON.parse(readFileSync(resolve(dist, "manifest.webmanifest"), "utf8"));
if (manifest.display !== "standalone" || manifest.scope !== "/" || !String(manifest.start_url).startsWith("/?")) throw new Error("PWA manifest is missing installability metadata.");
const serviceWorker = readFileSync(resolve(dist, "sw.js"), "utf8");
if (/(?:NetworkFirst|CacheFirst|StaleWhileRevalidate)[\s\S]{0,160}\/api\/|\/api\/[\s\S]{0,160}(?:NetworkFirst|CacheFirst|StaleWhileRevalidate)/.test(serviceWorker)) throw new Error("PWA service worker must not contain API runtime cache rules.");
console.log(`PWA artifacts verified: ${required.join(", ")}; API runtime caching absent.`);
