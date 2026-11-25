import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(scriptDir, "..");
const rootDir = path.resolve(frontendDir, "..");
const committedSpec = path.join(frontendDir, "src/api/generated/openapi.json");
const committedTypes = path.join(frontendDir, "src/api/generated/types.ts");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "blueprint-api-contract-"));
const freshSpec = path.join(tempDir, "openapi.json");
const freshTypes = path.join(tempDir, "types.ts");
const backendPython = process.env.BACKEND_PYTHON ?? path.join(rootDir, "backend/.venv/bin/python");

try {
  execFileSync(backendPython, [path.join(rootDir, "backend/scripts/export_openapi.py"), "--output", freshSpec], { cwd: rootDir, stdio: "inherit" });
  execFileSync(process.execPath, [path.join(frontendDir, "scripts/generate-api-types.mjs"), freshSpec, freshTypes], { cwd: rootDir, stdio: "inherit" });
  const committed = fs.readFileSync(committedSpec, "utf8");
  const generated = fs.readFileSync(freshSpec, "utf8");
  const committedTypeText = fs.readFileSync(committedTypes, "utf8");
  const generatedTypeText = fs.readFileSync(freshTypes, "utf8");
  if (committed !== generated || committedTypeText !== generatedTypeText) {
    console.error("Generated API contract is stale. Run: npm run api:generate:all");
    process.exitCode = 1;
  } else {
    console.log("Generated API contract is up to date.");
  }
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
