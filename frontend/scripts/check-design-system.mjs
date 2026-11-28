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
    "width",
    "height",
    "transition",
    "animation",
]);
const rawSvgExceptions = new Set(["components/ui/event-calendar-views.tsx"]);
const rawButtonExceptions = new Set(["components/ui/PageHeader.tsx"]);
const arbitraryClassExceptions = new Set();
const nativeElementExceptions = new Map([["components/ui/native-select.tsx", new Set(["select"])], ["components/ui/textarea.tsx", new Set(["textarea"])]]);
const bitmapColorExceptions = new Map([["features/profile/components/MfaQrCode.tsx", new Set(["#000000", "#ffffff"])]]);
const report = (file, sf, node, message) => errors.push(`${file}:${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1} ${message}`);
bitmapColorExceptions.set("features/identity/MfaQrCode.tsx", new Set(["#000000", "#ffffff"]));

function walk(dir, onFile) {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        if (["generated", "node_modules", "dist", "coverage", "storybook-static", "test-results", "playwright-report", ".git", ".vitest"].includes(entry.name)) continue;
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(file, onFile);
        else if (entry.isFile()) onFile(file);
    }
}

const relative = (file) => path.relative(sourceRoot, file).split(path.sep).join("/");
// Inspect all authored frontend stylesheets and include stories in static design checks.
walk(frontend, (file) => {
    if (cssExt.test(file) && file !== cssPath) errors.push(`DS-003 ${path.relative(frontend, file)}: index.css must be the sole authored stylesheet`);
    if (file.startsWith(sourceRoot) && /\.[jt]sx?$/.test(file) && !/\.(?:test|spec)\.[jt]sx?$/.test(file)) files.push(file);
});
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

function themeDeclarations(selector) {
    const result = new Map();
    for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const selectors = match[1].replace(/\/\*[\s\S]*?\*\//g, "").split(",").map((value) => value.trim());
        if (!selectors.includes(selector)) continue;
        for (const [name, value] of declarations(match[2])) result.set(name, value);
    }
    return result;
}

const light = themeDeclarations(":root");
const dark = new Map([...light, ...themeDeclarations('[data-theme="dark"]')]);
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
const hook = fs.readFileSync(path.join(sourceRoot, "lib/use-mobile.ts"), "utf8");
if (md !== light.get("--navigation-breakpoint") || !hook.includes(`FALLBACK_BREAKPOINT = "${md}"`)) errors.push("DS-016 mobile breakpoint, CSS md and JS fallback must agree");
const recipeNames = new Set([...css.matchAll(/\.((?:ui-)[\w-]+)(?=[\s.:,[{>+~#)]|$)/g)].map((m) => m[1]));
const definedVars = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
const animationLegacy = /(?:^|:)(?:animate-in|animate-out|fade-in-\d+|fade-out-\d+|zoom-in-\d+|zoom-out-\d+|slide-in-from-[\w-]+|slide-out-to-[\w-]+)$/;
const paletteUtility = /(?:^|:)(?:bg|text|border|ring|outline|fill|stroke|from|via|to|decoration)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}(?:\/\d+)?!?$/;
const namedPaletteUtility = /(?:^|:)(?:bg|text|border|ring|outline|fill|stroke|from|via|to|decoration)-(?:black|white)(?:\/\d+)?!?$/;
const genericVisualUtility = /^(?:(?:[\w-]+|\[[^\]]+\]):)*(?:gap(?:-[xy])?-(?:1|2|2[.]5|3|4|5|6)|space-[xy]-(?:1|2|2[.]5|3|4|5|6)|[mp][trblxy]?-(?:2|3|4|5|6)|text-(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl))!?$/;
const numericIconUtility = /^(?:(?:[\w-]+|\[[^\]]+\]):)*(?:size|[wh])-\d+(?:[.]\d+)?!?$/;
const rawColor = /(?:^|\s)(?:text|bg|border|ring|fill|stroke)-\[\s*#|(?:^|\s)\[(?:color|background-color|border-color):\s*(?:#|rgb\()/i;
const arbitraryToken = /(?:^|\s)(?:rounded|shadow|font)-\[[^\]]+\]|(?:^|\s)(?:text|leading|tracking)-\[\d+(?:\.\d+)?(?:px|rem|em)\]|(?:^|\s)(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y)-\[[^\]]+\]/i;

function inspectClass(file, sf, node, value) {
    if (rawColor.test(value)) report(file, sf, node, "DS-004 hard-coded class color");
    if (arbitraryToken.test(value) && !arbitraryClassExceptions.has(file)) report(file, sf, node, "DS-006 arbitrary static visual utility; use a CSS format or token");
    for (const token of value.trim().split(/\s+/)) {
        if (paletteUtility.test(token)) report(file, sf, node, `DS-005 raw palette utility ${token}`);
        if (namedPaletteUtility.test(token)) report(file, sf, node, `DS-005 raw named palette utility ${token}`);
        if (genericVisualUtility.test(token)) report(file, sf, node, `DS-006 generic visual utility ${token}; use a semantic token or shared component`);
        if (animationLegacy.test(token)) report(file, sf, node, `DS-015 unsupported legacy animation ${token}`);
        if (/^ui-[\w-]+$/.test(token) && !recipeNames.has(token)) report(file, sf, node, `DS-014 missing CSS format ${token}`);
        // Only our own token namespaces: Base UI/FullCalendar/DayPicker/runtime geometry is not static ownership.
        for (const match of token.matchAll(/--(?:ui-radius|space|motion|chart|container|icon-size|control|card-padding|sidebar-width|header-height|page-gutter)[\w-]*/g)) {
            if (!definedVars.has(match[0])) report(file, sf, node, `DS-014 undefined CSS token ${match[0]}`);
        }
    }
}

function classLiterals(node, callback, constants = new Map(), resolving = new Set()) {
    if (!node) return;
    if (ts.isStringLiteralLike(node)) {
        callback(node, node.text);
        return;
    }
    if (ts.isConditionalExpression(node)) {
        classLiterals(node.whenTrue, callback, constants, resolving);
        classLiterals(node.whenFalse, callback, constants, resolving);
        return;
    }
    if (ts.isBinaryExpression(node)) {
        if (node.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken) classLiterals(node.left, callback, constants, resolving);
        classLiterals(node.right, callback, constants, resolving);
        return;
    }
    if (ts.isCallExpression(node) && /^(?:cn|clsx|twMerge|cva)$/.test(node.expression.getText())) {
        for (const arg of node.arguments) classLiterals(arg, callback, constants, resolving);
        return;
    }
    if (ts.isArrayLiteralExpression(node)) {
        for (const item of node.elements) classLiterals(item, callback, constants, resolving);
        return;
    }
    if (ts.isObjectLiteralExpression(node)) {
        for (const prop of node.properties) {
            if (ts.isPropertyAssignment(prop)) {
                if (ts.isStringLiteralLike(prop.name)) callback(prop.name, prop.name.text);
                classLiterals(prop.initializer, callback, constants, resolving);
            }
        }
        return;
    }
    if (ts.isTemplateExpression(node)) {
        callback(node.head, node.head.text);
        for (const span of node.templateSpans) {
            callback(span.literal, span.literal.text);
            classLiterals(span.expression, callback, constants, resolving);
        }
    }
    if (ts.isParenthesizedExpression(node)) classLiterals(node.expression, callback, constants, resolving);
    if (ts.isIdentifier(node) && constants.has(node.text) && !resolving.has(node.text)) {
        const next = new Set(resolving).add(node.text);
        classLiterals(constants.get(node.text), callback, constants, next);
    }
}

function resolveConstant(node, constants, resolving = new Set()) {
    while (node && ts.isParenthesizedExpression(node)) node = node.expression;
    if (!node || !ts.isIdentifier(node) || !constants.has(node.text) || resolving.has(node.text)) return node;
    return resolveConstant(constants.get(node.text), constants, new Set(resolving).add(node.text));
}

for (const absolute of files) {
    const file = relative(absolute);
    const sourceText = fs.readFileSync(absolute, "utf8");
    const sf = ts.createSourceFile(absolute, sourceText, ts.ScriptTarget.Latest, true, absolute.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    if (sf.parseDiagnostics.length) errors.push(`${file}: invalid source syntax`);
    for (const match of sourceText.matchAll(/#(?:[\da-f]{3,8})\b|rgba?\(/ig)) {
        if (!bitmapColorExceptions.get(file)?.has(match[0].toLowerCase())) errors.push(`${file}:${sourceText.slice(0, match.index).split("\n").length} DS-004 hard-coded color literal`);
    }
    const constants = new Map();
    const lucideIcons = new Set();
    function collect(node) {
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) constants.set(node.name.text, node.initializer);
        if (ts.isImportDeclaration(node) && node.moduleSpecifier.text === "lucide-react" && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
            for (const icon of node.importClause.namedBindings.elements) lucideIcons.add(icon.name.text);
        }
        ts.forEachChild(node, collect);
    }
    collect(sf);
    const checkClass = (node, value) => inspectClass(file, sf, node, value);

    function visit(node) {
        if (ts.isImportDeclaration(node) && ts.isStringLiteralLike(node.moduleSpecifier)) {
            const name = node.moduleSpecifier.text;
            if (banned.test(name)) report(file, sf, node, `DS-001 forbidden import ${name}`);
            if (cssExt.test(name) && !/(?:^|\/)index\.css$/.test(name) && !/^@fullcalendar\/react\/skeleton\.css$/.test(name)) report(file, sf, node, `DS-003 unapproved stylesheet import ${name}`);
            if (name === "lucide-react" && node.importClause?.namedBindings && ts.isNamespaceImport(node.importClause.namedBindings)) report(file, sf, node, "DS-012 use named Lucide icons");
            if (name === "lucide-react" && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
                for (const icon of node.importClause.namedBindings.elements) {
                    if (icon.propertyName) report(file, sf, icon, "DS-012 use Lucide export names without legacy aliases");
                }
            }
        }
        if (ts.isJsxAttribute(node)) {
            const name = node.name.getText(sf), init = node.initializer;
            const value = init && ts.isStringLiteral(init) ? init.text : null;
            if (name === "fontSize") report(file, sf, node, "DS-012 use semantic icon sizes");
            if (["className", "classNames"].includes(name) && init) classLiterals(ts.isJsxExpression(init) ? init.expression : init, checkClass, constants);
            if (name === "style" && init && ts.isJsxExpression(init)) {
                const expr = resolveConstant(init.expression, constants);
                if (expr && ts.isObjectLiteralExpression(expr)) for (const prop of expr.properties) {
                    if (!ts.isPropertyAssignment(prop)) continue;
                    const key = prop.name.getText(sf).replace(/["']/g, "");
                    if (semanticStyleProperties.has(key) && (ts.isNumericLiteral(prop.initializer) || ts.isStringLiteral(prop.initializer))) report(file, sf, prop, `DS-008 static style.${key}; use index.css`);
                }
            }
            if (name === "role" && value && /^(dialog|alertdialog|menu|tablist|listbox)$/.test(value)) report(file, sf, node, `DS-011 custom role=${value}; use shared primitive`);
        }
        if (ts.isCallExpression(node) && /^(?:cn|clsx|twMerge|cva)$/.test(node.expression.getText(sf))) classLiterals(node, checkClass, constants);
        if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isStringLiteralLike(node.arguments[0])) {
            const name = node.arguments[0].text;
            if (banned.test(name)) report(file, sf, node, `DS-001 forbidden dynamic import ${name}`);
            if (cssExt.test(name) && !/^@fullcalendar\/react\/skeleton[.]css$/.test(name)) report(file, sf, node, `DS-003 unapproved dynamic stylesheet import ${name}`);
        }
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
            const tag = node.tagName.getText(sf);
            if (tag === "svg" && !rawSvgExceptions.has(file)) report(file, sf, node, "DS-010 raw SVG; use Lucide or documented geometry");
            if (tag === "button" && !rawButtonExceptions.has(file)) report(file, sf, node, "DS-011 raw button; use shared Button");
            if (["select", "textarea"].includes(tag) && !nativeElementExceptions.get(file)?.has(tag)) report(file, sf, node, `DS-011 raw ${tag}; use shared native control`);
            if (tag === "input") {
                const type = node.attributes.properties.find((attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText(sf) === "type");
                if (type && ts.isJsxAttribute(type) && type.initializer) {
                    const typeNode = ts.isJsxExpression(type.initializer) ? resolveConstant(type.initializer.expression, constants) : type.initializer;
                    if (typeNode && ts.isStringLiteralLike(typeNode) && /^(?:checkbox|radio)$/.test(typeNode.text)) report(file, sf, node, `DS-011 raw ${typeNode.text}; use shared control`);
                }
            }
            if (lucideIcons.has(tag)) {
                const className = node.attributes.properties.find((attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText(sf) === "className");
                if (className && ts.isJsxAttribute(className) && className.initializer) classLiterals(ts.isJsxExpression(className.initializer) ? className.initializer.expression : className.initializer, (classNode, value) => {
                    for (const token of value.trim().split(/\s+/)) if (numericIconUtility.test(token)) report(file, sf, classNode, `DS-012 numeric icon utility ${token}; use an icon token`);
                }, constants);
                for (const attribute of node.attributes.properties) {
                    if (!ts.isJsxAttribute(attribute) || !/^(?:size|width|height)$/.test(attribute.name.getText(sf))) continue;
                    const initializer = attribute.initializer && (ts.isJsxExpression(attribute.initializer) ? attribute.initializer.expression : attribute.initializer);
                    if (initializer && (ts.isNumericLiteral(initializer) || ts.isStringLiteralLike(initializer))) report(file, sf, attribute, "DS-012 direct Lucide size prop; use an icon token");
                }
            }
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
