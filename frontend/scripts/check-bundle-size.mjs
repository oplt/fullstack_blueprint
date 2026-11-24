import { gzipSync } from "node:zlib";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const dist = resolve(process.cwd(), "dist");
const budgets = {
  totalGzip: Number(process.env.BLUEPRINT_BUNDLE_MAX_GZIP ?? 1_200_000),
  javascriptGzip: Number(process.env.BLUEPRINT_JS_MAX_GZIP ?? 400_000),
  cssGzip: Number(process.env.BLUEPRINT_CSS_MAX_GZIP ?? 35_000),
  assetCount: Number(process.env.BLUEPRINT_MAX_ASSET_COUNT ?? 60),
};

if (!statSync(dist, { throwIfNoEntry: false })) {
  throw new Error("dist/ does not exist; run npm run build before the bundle check.");
}

const files = [];
function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else files.push(path);
  }
}
walk(dist);

const measurements = files.map((path) => {
  const bytes = readFileSync(path);
  return { path, extension: extname(path), bytes: bytes.length, gzip: gzipSync(bytes, { level: 9 }).length };
});
const total = (items) => items.reduce((sum, item) => sum + item.gzip, 0);
const javascript = total(measurements.filter((item) => [".js", ".mjs"].includes(item.extension)));
const css = total(measurements.filter((item) => item.extension === ".css"));
const result = { files: measurements.length, totalGzip: total(measurements), javascriptGzip: javascript, cssGzip: css, assetCount: measurements.filter((item) => item.path.includes("/assets/") && [".js", ".mjs", ".css"].includes(item.extension)).length, budgets };
console.log(JSON.stringify(result, null, 2));

const failures = [];
if (result.totalGzip > budgets.totalGzip) failures.push(`total gzip ${result.totalGzip} exceeds ${budgets.totalGzip}`);
if (result.javascriptGzip > budgets.javascriptGzip) failures.push(`JavaScript gzip ${result.javascriptGzip} exceeds ${budgets.javascriptGzip}`);
if (result.cssGzip > budgets.cssGzip) failures.push(`CSS gzip ${result.cssGzip} exceeds ${budgets.cssGzip}`);
if (result.assetCount > budgets.assetCount) failures.push(`asset count ${result.assetCount} exceeds ${budgets.assetCount}`);
if (failures.length) throw new Error(`Bundle budget failed: ${failures.join("; ")}`);
console.log("Bundle budgets passed.");
