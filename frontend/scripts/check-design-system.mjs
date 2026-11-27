import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import ts from "typescript";

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(frontend, "src");
const root = path.dirname(frontend);
const cssPath = path.join(sourceRoot, "index.css");
const css = fs.readFileSync(cssPath, "utf8");
const design = fs.readFileSync(path.join(root, "DESIGN.md"), "utf8");
const errors = [];
const files = [];
const banned = /(?:^|\/)(?:@mui\/|@material-ui\/|@emotion\/|styled-components(?:\/|$)|bootstrap(?:\/|$)|@chakra-ui\/|antd(?:\/|$)|muiCompat(?:\.|$)|styleCompat(?:\.|$)|iconsCompat(?:\.|$))/;
const cssExt = /\.(?:css|scss|sass|less|styl|stylus)$/i;
const semanticStyleProperties = new Set([
    "color",
    "backgroundColor",
    "background",
    "border",
    "borderColor",
    "borderWidth",
    "borderStyle",
    "borderRadius",
    "borderTop",
    "borderRight",
    "borderBottom",
    "borderLeft",
    "boxShadow",
    "padding",
    "paddingBlock",
    "paddingInline",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "margin",
    "marginBlock",
    "marginInline",
    "marginTop",
    "marginRight",
    "marginBottom",
    "marginLeft",
    "gap",
    "rowGap",
    "columnGap",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "fontStyle",
    "lineHeight",
    "letterSpacing",
    "textAlign",
    "textDecoration",
    "whiteSpace",
    "wordBreak",
    "overflowWrap",
    "maxWidth",
    "minWidth",
    "display",
    "gridTemplateColumns",
    "gridTemplateRows",
    "flexDirection",
    "alignItems",
    "justifyContent",
    "opacity",
    "zIndex",
    "transition",
    "animation",
]);
const rawSvgExceptions = new Set(["components/ui/event-calendar-views.tsx"]);
const rawButtonExceptions = new Set(["components/ui/PageHeader.tsx"]);
const arbitraryClassExceptions = new Set(["components/ui/tooltip.tsx"]);
const nativeElementExceptions = new Map([["components/ui/native-select.tsx", new Set(["select"])], ["components/ui/textarea.tsx", new Set(["textarea"])]]);
const bitmapColorExceptions = new Set(["features/profile/components/MfaQrCode.tsx"]);
const report = (file, sf, node, message) => errors.push(`${file}:${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1} ${message}`);

function walk(dir, onFile) {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        if (["generated", "node_modules", "dist", "coverage", "storybook-static", "test-results", "playwright-report", ".git", ".vitest"].includes(entry.name)) continue;
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(file, onFile);
        else if (entry.isFile()) onFile(file);
    }
}

const relative = (file) => path.relative(sourceRoot, file).split(path.sep).join("/");
// Inspect all authored frontend stylesheets, including public and Storybook.
for (const folder of [sourceRoot, path.join(frontend, "public"), path.join(frontend, ".storybook")]) {
    if (!fs.existsSync(folder)) continue;
    walk(folder, (file) => {
        if (cssExt.test(file) && file !== cssPath) errors.push(`DS-003 ${path.relative(frontend, file)}: index.css must be the sole authored stylesheet`);
        if (folder === sourceRoot && /\.[jt]sx?$/.test(file) && !/\.(?:test|stories|spec)\.[jt]sx?$/.test(file)) files.push(file);
    });
}
const manifest = JSON.parse(fs.readFileSync(path.join(frontend, "package.json"), "utf8"));
const lock = JSON.parse(fs.readFileSync(path.join(frontend, "package-lock.json"), "utf8"));
for (const section of [manifest.dependencies, manifest.devDependencies, manifest.optionalDependencies, manifest.peerDependencies]) {
    for (const name of Object.keys(section ?? {})) if (banned.test(name)) errors.push(`DS-001 package.json: forbidden UI dependency ${name}`);
}
for (const name of Object.keys(lock.packages ?? {})) {
    if (banned.test(name)) errors.push(`DS-001 package-lock.json: forbidden UI dependency ${name}`);
}

function declarations(block) {
    return new Map([...block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

const light = declarations(css.match(/:root\s*\{([^}]+)\}/)?.[1] ?? "");
const dark = new Map([...light, ...declarations(css.match(/\[data-theme="dark"\]\s*\{([^}]+)\}/)?.[1] ?? "")]);
const normalize = (value) => value?.replace(/\s+/g, "").toLowerCase();
let checkedColors = 0;
for (const row of design.matchAll(/^\|\s*`(--[\w-]+)`\s*\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|/gm)) {
    const [, token, l, d] = row;
    if (!/^(?:#|var\(--)/.test(l) || !/^(?:#|var\(--)/.test(d)) continue;
    checkedColors++;
    for (const [mode, map, expected] of [["light", light, l], ["dark", dark, d]]) {
        if (normalize(map.get(token)) !== normalize(expected)) errors.push(`DS-016 ${mode} ${token}: DESIGN.md ${expected}, CSS ${map.get(token) ?? "missing"}`);
    }
}
if (checkedColors < 45) errors.push("DS-016 DESIGN.md: missing canonical palette tables");
const md = css.match(/--breakpoint-md:\s*([^;]+);/)?.[1].trim();
const hook = fs.readFileSync(path.join(sourceRoot, "hooks/use-mobile.ts"), "utf8");
if (md !== light.get("--navigation-breakpoint") || !hook.includes(`FALLBACK_BREAKPOINT = "${md}"`)) errors.push("DS-016 mobile breakpoint, CSS md and JS fallback must agree");
const recipeNames = new Set([...css.matchAll(/\.((?:ui-)[\w-]+)(?=[\s.:,[{>+~#)]|$)/g)].map((m) => m[1]));
const definedVars = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
const animationLegacy = /(?:^|:)(?:animate-in|animate-out|fade-in-\d+|fade-out-\d+|zoom-in-\d+|zoom-out-\d+|slide-in-from-[\w-]+|slide-out-to-[\w-]+)$/;
const paletteUtility = /(?:^|:)(?:bg|text|border|ring|outline|fill|stroke|from|via|to|decoration)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}(?:\/\d+)?!?$/;
const rawColor = /(?:^|\s)(?:text|bg|border|ring|fill|stroke)-\[\s*#|(?:^|\s)\[(?:color|background-color|border-color):\s*(?:#|rgb\()/i;
const arbitraryToken = /(?:^|\s)(?:rounded|shadow|font)-\[[^\]]+\]|(?:^|\s)(?:text|leading|tracking)-\[\d+(?:\.\d+)?(?:px|rem|em)\]|(?:^|\s)(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y)-\[[^\]]+\]/i;

function inspectClass(file, sf, node, value) {
    if (rawColor.test(value)) report(file, sf, node, "DS-004 hard-coded class color");
    if (arbitraryToken.test(value) && !arbitraryClassExceptions.has(file)) report(file, sf, node, "DS-006 arbitrary static visual utility; use a CSS format or token");
    for (const token of value.trim().split(/\s+/)) {
        if (paletteUtility.test(token)) report(file, sf, node, `DS-005 raw palette utility ${token}`);
        if (animationLegacy.test(token)) report(file, sf, node, `DS-015 unsupported legacy animation ${token}`);
        if (/^ui-[\w-]+$/.test(token) && !recipeNames.has(token)) report(file, sf, node, `DS-014 missing CSS format ${token}`);
        // Only our own token namespaces: Base UI/FullCalendar/DayPicker/runtime geometry is not static ownership.
        for (const match of token.matchAll(/--(?:ui-radius|space|motion|chart|container|icon-size|control|card-padding|sidebar-width|header-height|page-gutter)[\w-]*/g)) {
            if (!definedVars.has(match[0])) report(file, sf, node, `DS-014 undefined CSS token ${match[0]}`);
        }
    }
}

function classLiterals(node, callback) {
    if (!node) return;
    if (ts.isStringLiteralLike(node)) {
        callback(node, node.text);
        return;
    }
    if (ts.isConditionalExpression(node)) {
        classLiterals(node.whenTrue, callback);
        classLiterals(node.whenFalse, callback);
        return;
    }
    if (ts.isBinaryExpression(node)) {
        if (node.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken) classLiterals(node.left, callback);
        classLiterals(node.right, callback);
        return;
    }
    if (ts.isCallExpression(node) && /^(?:cn|clsx|twMerge|cva)$/.test(node.expression.getText())) {
        for (const arg of node.arguments) classLiterals(arg, callback);
        return;
    }
    if (ts.isArrayLiteralExpression(node)) {
        for (const item of node.elements) classLiterals(item, callback);
        return;
    }
    if (ts.isObjectLiteralExpression(node)) {
        for (const prop of node.properties) if (ts.isPropertyAssignment(prop)) classLiterals(prop.initializer, callback);
        return;
    }
    if (ts.isTemplateExpression(node)) {
        callback(node.head, node.head.text);
        for (const span of node.templateSpans) {
            callback(span.literal, span.literal.text);
            classLiterals(span.expression, callback);
        }
    }
    if (ts.isParenthesizedExpression(node)) classLiterals(node.expression, callback);
}

for (const absolute of files) {
    const file = relative(absolute);
    const sourceText = fs.readFileSync(absolute, "utf8");
    const sf = ts.createSourceFile(absolute, sourceText, ts.ScriptTarget.Latest, true, absolute.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    if (sf.parseDiagnostics.length) errors.push(`${file}: invalid source syntax`);
    if (!bitmapColorExceptions.has(file)) {
        for (const match of sourceText.matchAll(/#(?:[\da-f]{3,8})\b|rgba?\(/ig)) errors.push(`${file}:${sourceText.slice(0, match.index).split("\n").length} DS-004 hard-coded color literal`);
    }
    const checkClass = (node, value) => inspectClass(file, sf, node, value);

    function visit(node) {
        if (ts.isImportDeclaration(node) && ts.isStringLiteralLike(node.moduleSpecifier)) {
            const name = node.moduleSpecifier.text;
            if (banned.test(name)) report(file, sf, node, `DS-001 forbidden import ${name}`);
            if (cssExt.test(name) && !/(?:^|\/)index\.css$/.test(name) && !/^@fullcalendar\/react\/skeleton\.css$/.test(name)) report(file, sf, node, `DS-003 unapproved stylesheet import ${name}`);
            if (name === "lucide-react" && node.importClause?.namedBindings && ts.isNamespaceImport(node.importClause.namedBindings)) report(file, sf, node, "DS-012 use named Lucide icons");
        }
        if (ts.isJsxAttribute(node)) {
            const name = node.name.getText(sf), init = node.initializer;
            const value = init && ts.isStringLiteral(init) ? init.text : null;
            if (name === "fontSize") report(file, sf, node, "DS-012 use semantic icon sizes");
            if (["className", "classNames"].includes(name) && init) classLiterals(ts.isJsxExpression(init) ? init.expression : init, checkClass);
            if (name === "style" && init && ts.isJsxExpression(init)) {
                let expr = init.expression;
                while (expr && ts.isParenthesizedExpression(expr)) expr = expr.expression;
                if (expr && ts.isObjectLiteralExpression(expr)) for (const prop of expr.properties) {
                    if (!ts.isPropertyAssignment(prop)) continue;
                    const key = prop.name.getText(sf).replace(/["']/g, "");
                    if (semanticStyleProperties.has(key) && (ts.isNumericLiteral(prop.initializer) || ts.isStringLiteral(prop.initializer))) report(file, sf, prop, `DS-008 static style.${key}; use index.css`);
                }
            }
            if (name === "role" && value && /^(dialog|alertdialog|menu|tablist|listbox)$/.test(value)) report(file, sf, node, `DS-011 custom role=${value}; use shared primitive`);
        }
        if (ts.isCallExpression(node) && /^(?:cn|clsx|twMerge|cva)$/.test(node.expression.getText(sf))) classLiterals(node, checkClass);
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
            const tag = node.tagName.getText(sf);
            if (tag === "svg" && !rawSvgExceptions.has(file)) report(file, sf, node, "DS-010 raw SVG; use Lucide or documented geometry");
            if (tag === "button" && !rawButtonExceptions.has(file)) report(file, sf, node, "DS-011 raw button; use shared Button");
            if (["select", "textarea"].includes(tag) && !nativeElementExceptions.get(file)?.has(tag)) report(file, sf, node, `DS-011 raw ${tag}; use shared native control`);
        }
        ts.forEachChild(node, visit);
    }

    visit(sf);
}
const unique = [...new Set(errors)];
if (unique.length) {
    console.error(`Design system check found ${unique.length} issue(s):\n${unique.map((error) => `- ${error}`).join("\n")}`);
    process.exitCode = 1;
} else console.log(`Design system check passed: ${files.length} source files, ${checkedColors} palette roles, ${recipeNames.size} CSS formats.`);
