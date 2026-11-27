import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "design-checker-"));
const fixture = path.join(temp, "frontend");
const src = path.join(fixture, "src");
const script = path.join(fixture, "scripts", "check-design-system.mjs");
const entry = path.join(src, "Example.tsx");
function run() { return spawnSync(process.execPath, [script], { encoding: "utf8" }); }
function reject(code, expected) {
    fs.writeFileSync(entry, code);
    const result = run();
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, expected);
}
try {
    for (const dir of [path.dirname(script), path.join(src, "hooks")]) fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(path.join(source, "scripts/check-design-system.mjs"), script);
    fs.copyFileSync(path.join(source, "src/index.css"), path.join(src, "index.css"));
    fs.copyFileSync(path.join(source, "src/hooks/use-mobile.ts"), path.join(src, "hooks/use-mobile.ts"));
    fs.copyFileSync(path.resolve(source, "../DESIGN.md"), path.join(temp, "DESIGN.md"));
    fs.writeFileSync(path.join(fixture, "package.json"), JSON.stringify({name:"fixture",type:"module"}));
    fs.writeFileSync(path.join(fixture, "package-lock.json"), JSON.stringify({packages:{}}));
    fs.symlinkSync(path.join(source, "node_modules"), path.join(fixture, "node_modules"), "junction");
    fs.writeFileSync(entry, 'export const Example = () => <div className="ui-card text-body-md text-muted-foreground"/>;');
    const clean = run(); assert.equal(clean.status, 0, clean.stdout + clean.stderr);
    reject('export const Example = () => <div className="bg-red-500"/>;', /DS-005/);
    reject('export const Example = () => <div className="data-open:animate-in"/>;', /DS-015/);
    reject('export const Example = () => <div className="ui-no-such-format"/>;', /DS-014/);
    reject('export const Example = () => <div style={({padding: 11})}/>;', /DS-008/);
    reject('import Button from "@mui/material/Button"; export const Example = () => <Button/>;', /DS-001/);
    fs.writeFileSync(entry, 'export const Example = () => <div className="ui-card"/>;');
    fs.writeFileSync(path.join(src, "rogue.css"), "body{}");
    assert.match(run().stderr, /DS-003/);
    fs.unlinkSync(path.join(src, "rogue.css"));
    const cssPath = path.join(src, "index.css");
    fs.writeFileSync(cssPath, fs.readFileSync(cssPath, "utf8").replace("--background: #fafafa;", "--background: #ffffff;"));
    assert.match(run().stderr, /DS-016/);
    console.log("Design checker regression fixtures passed (valid case + 7 rejection cases).");
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
