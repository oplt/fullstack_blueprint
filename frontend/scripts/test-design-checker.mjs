import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "design-checker-"));
const fixture = path.join(temp, "frontend");
const src = path.join(fixture, "src");
const script = path.join(fixture, "scripts", "check-design-system.mjs");
const entry = path.join(src, "Example.tsx");
let runNumber = 0;
function run() {
    const id = runNumber++;
    const stdoutPath = path.join(temp, `stdout-${id}.log`);
    const stderrPath = path.join(temp, `stderr-${id}.log`);
    const stdout = fs.openSync(stdoutPath, "w");
    const stderr = fs.openSync(stderrPath, "w");
    return new Promise((resolve) => {
        const child = spawn(process.execPath, [script], { stdio: ["ignore", stdout, stderr] });
        let finished = false;
        const finish = (status, error) => {
            if (finished) return;
            finished = true;
            fs.closeSync(stdout);
            fs.closeSync(stderr);
            resolve({
                status,
                stdout: fs.readFileSync(stdoutPath, "utf8"),
                stderr: fs.readFileSync(stderrPath, "utf8"),
                error,
            });
        };
        child.once("error", (error) => finish(null, error));
        child.once("close", (status) => finish(status));
    });
}
async function reject(code, expected) {
    fs.writeFileSync(entry, code);
    const result = await run();
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
    const clean = await run(); assert.equal(clean.status, 0, clean.stdout + clean.stderr);
    await reject('export const Example = () => <div className="bg-red-500"/>;', /DS-005/);
    await reject('export const Example = () => <div className="data-open:animate-in"/>;', /DS-015/);
    await reject('export const Example = () => <div className="ui-no-such-format"/>;', /DS-014/);
    await reject('export const Example = () => <div style={({padding: 11})}/>;', /DS-008/);
    await reject('import { Plus as AddIcon } from "lucide-react"; export const Example = () => <AddIcon/>;', /DS-012/);
    await reject('export const Example = () => <div className="bg-white"/>;', /DS-005/);
    await reject('export const Example = () => <div className="text-black"/>;', /DS-005/);
    await reject('export const Example = () => <div className="gap-3"/>;', /DS-006/);
    await reject('export const Example = () => <div className="mt-4"/>;', /DS-006/);
    await reject('export const Example = () => <div className="text-sm"/>;', /DS-006/);
    await reject('export const Example = () => <input type="checkbox"/>;', /DS-011/);
    await reject('export const Example = () => <input type="radio"/>;', /DS-011/);
    await reject('export const Example = () => <input type={"checkbox"}/>;', /DS-011/);
    await reject('import { cn } from "./utils"; export const Example = ({active}) => <div className={cn({"bg-red-500": active})}/>;', /DS-005/);
    await reject('const visualClass = "bg-red-500"; export const Example = () => <div className={visualClass}/>;', /DS-005/);
    await reject('const visualStyle = { padding: 12 }; export const Example = () => <div style={visualStyle}/>;', /DS-008/);
    await reject('export async function loadStyles() { await import("./rogue.css"); }', /DS-003/);
    await reject('import Button from "@mui/material/Button"; export const Example = () => <Button/>;', /DS-001/);
    fs.writeFileSync(entry, 'export const Example = () => <div className="ui-card"/>;');
    fs.writeFileSync(path.join(src, "rogue.css"), "body{}");
    assert.match((await run()).stderr, /DS-003/);
    fs.unlinkSync(path.join(src, "rogue.css"));
    const cssPath = path.join(src, "index.css");
    fs.writeFileSync(cssPath, fs.readFileSync(cssPath, "utf8").replace("--background: #fafafa;", "--background: #ffffff;"));
    assert.match((await run()).stderr, /DS-016/);
    console.log("Design checker regression fixtures passed (valid case + 20 rejection cases).");
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
