import { gzipSync } from "node:zlib";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const dist = resolve(process.cwd(), "dist");
const files = [];
function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else files.push(path);
  }
}
walk(dist);
const measurements = files.map((path) => { const data = readFileSync(path); return { path: path.slice(dist.length + 1), bytes: data.length, gzip: gzipSync(data, { level: 9 }).length }; });
const sum = (predicate) => measurements.filter(predicate).reduce((total, item) => ({ bytes: total.bytes + item.bytes, gzip: total.gzip + item.gzip }), { bytes: 0, gzip: 0 });
const byExtension = Object.fromEntries([...new Set(measurements.map((item) => extname(item.path) || "[none]"))].map((extension) => [extension, sum((item) => (extname(item.path) || "[none]") === extension)]));
const largest = [...measurements].sort((a, b) => b.bytes - a.bytes).slice(0, 10);
const manifest = JSON.parse(readFileSync(join(dist, "manifest.webmanifest"), "utf8"));
console.log(JSON.stringify({ files: measurements.length, total: sum(() => true), byExtension, largest, pwa: { precacheEntries: files.filter((path) => path.includes("/assets/")).length, manifestDisplay: manifest.display, startUrl: manifest.start_url } }, null, 2));
