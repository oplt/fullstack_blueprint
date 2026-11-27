import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const sourceRoot = path.resolve("src");
const semanticStyleProperties = new Set([
  "color", "backgroundColor", "borderColor", "borderRadius", "boxShadow",
  "padding", "paddingBlock", "paddingInline", "paddingTop", "paddingRight",
  "paddingBottom", "paddingLeft", "margin", "marginBlock", "marginInline",
  "marginTop", "marginRight", "marginBottom", "marginLeft", "gap", "rowGap",
  "columnGap", "fontSize", "fontWeight", "lineHeight",
]);

// The FullCalendar continuation marker is geometric library rendering, not an icon.
const rawSvgExceptions = new Map([
  ["components/ui/event-calendar-views.tsx", "FullCalendar continuation geometry"],
]);
// Base UI's Menu.Item needs a native button as its render target for correct semantics.
const rawButtonExceptions = new Map([
  ["components/ui/PageHeader.tsx", "Base UI Menu.Item render target"],
]);
// The tooltip arrow needs its 2px corner radius to retain the library's pointed geometry.
const arbitraryClassExceptions = new Map([
  ["components/ui/tooltip.tsx", "Base UI tooltip arrow geometry"],
]);
const nativeElementExceptions = new Map([
  ["components/ui/native-select.tsx", new Set(["select"])],
  ["components/ui/textarea.tsx", new Set(["textarea"])],
]);
// qrcode encodes these colors into the QR bitmap; they are not UI palette values.
const bitmapColorExceptions = new Map([
  ["features/profile/components/MfaQrCode.tsx", "QR foreground/background encoding"],
]);

const errors = [];
const files = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!["generated", "node_modules"].includes(entry.name)) walk(file);
      continue;
    }
    if (!/\.tsx?$/.test(file) || /\.(test|stories)\.tsx?$/.test(file)) continue;
    files.push(file);
  }
}

function report(file, sourceFile, node, message) {
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  errors.push(`${path.relative(sourceRoot, file)}:${line + 1} ${message}`);
}

function checkClassValue(file, sourceFile, node, value, relative) {
  const rawColor = /(?:^|\s)(?:text|bg|border)-\[\s*#|(?:^|\s)\[(?:color|background-color|border-color):\s*(?:#|rgb\()/i;
  const arbitraryToken = /(?:^|\s)(?:rounded|shadow|font)-\[[^\]]+\]|(?:^|\s)(?:text|leading|tracking)-\[\d+(?:\.\d+)?(?:px|rem|em)\]|(?:^|\s)(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y)-\[[^\]]+\]/i;
  if (rawColor.test(value)) report(file, sourceFile, node, "hard-coded color in className; use a semantic token");
  if (arbitraryToken.test(value) && !arbitraryClassExceptions.has(relative)) report(file, sourceFile, node, "arbitrary semantic utility; use a design token utility");
}

walk(sourceRoot);
for (const file of files) {
  const relative = path.relative(sourceRoot, file).split(path.sep).join("/");
  const sourceText = fs.readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  if (!bitmapColorExceptions.has(relative)) {
    const rawColor = /#(?:[\da-f]{3,8})\b|rgba?\(/ig;
    for (const match of sourceText.matchAll(rawColor)) {
      const line = sourceText.slice(0, match.index).split("\n").length;
      errors.push(`${relative}:${line} hard-coded color literal; use a semantic token`);
    }
  }
  function visit(node) {
    if (ts.isJsxAttribute(node)) {
      const name = node.name.getText(sourceFile);
      const value = node.initializer && ts.isStringLiteral(node.initializer) ? node.initializer.text : null;
      if (name === "fontSize") report(file, sourceFile, node, "icon size prop; use consistent size utilities");
      if (name === "className" && node.initializer) {
        checkClassValue(file, sourceFile, node, value ?? node.initializer.getText(sourceFile), relative);
      }
      if (name === "style" && node.initializer && ts.isJsxExpression(node.initializer)) {
        const expression = node.initializer.expression;
        if (expression && ts.isObjectLiteralExpression(expression)) {
          for (const property of expression.properties) {
            if (!ts.isPropertyAssignment(property)) continue;
            const key = property.name.getText(sourceFile);
            if (semanticStyleProperties.has(key) && (ts.isNumericLiteral(property.initializer) || ts.isStringLiteral(property.initializer))) {
              report(file, sourceFile, property, `static style.${key}; use a design token utility`);
            }
            if (ts.isStringLiteral(property.initializer) && /#(?:[\da-f]{3,8})\b|rgba?\(/i.test(property.initializer.text)) {
              if (!bitmapColorExceptions.has(relative)) report(file, sourceFile, property, "hard-coded color in inline style; use a semantic token");
            }
          }
        }
      }
      if (name === "role" && value && /^(dialog|alertdialog|menu|tablist|listbox)$/.test(value)) {
        report(file, sourceFile, node, `custom role="${value}"; use the shared Base UI primitive`);
      }
    }
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(sourceFile);
      if (tag === "svg" && !rawSvgExceptions.has(relative)) report(file, sourceFile, node, "raw SVG; use a named Lucide icon or documented visual primitive");
      if (tag === "button" && !rawButtonExceptions.has(relative)) report(file, sourceFile, node, "raw button; use the shared Button primitive");
      if ((tag === "select" || tag === "textarea") && !nativeElementExceptions.get(relative)?.has(tag)) {
        report(file, sourceFile, node, `raw ${tag}; use the shared native control primitive`);
      }
    }
    if (ts.isImportDeclaration(node) && node.moduleSpecifier.getText(sourceFile) === '"lucide-react"' && node.importClause?.namedBindings && ts.isNamespaceImport(node.importClause.namedBindings)) {
      report(file, sourceFile, node, "namespace Lucide import; use direct named icons");
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

if (errors.length) {
  console.error(`Design system check found ${errors.length} issue(s):\n${errors.map((error) => `- ${error}`).join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`Design system check passed for ${files.length} frontend source files.`);
  for (const [file, reason] of [...rawSvgExceptions, ...rawButtonExceptions, ...arbitraryClassExceptions, ...bitmapColorExceptions]) {
    console.log(`Reviewed exception: ${file} (${reason})`);
  }
  for (const [file, elements] of nativeElementExceptions) {
    console.log(`Reviewed native controls: ${file} (${[...elements].join(", ")})`);
  }
}
