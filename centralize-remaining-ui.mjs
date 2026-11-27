#!/usr/bin/env node
/**
 * Staged migration of static reusable Tailwind recipes into src/index.css.
 * Run from repository root after copying the reviewed replacement files.
 * Preview only. Apply reviewed changes using git diff and copy.
 * No packages, Git commands, network access, or feature/API rewrites.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const args = process.argv.slice(2);
const option = (name) => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
const root = path.resolve(option('--root') ?? process.cwd());
const frontend = path.join(root, 'frontend');
const source = path.join(frontend, 'src');
const cssPath = path.join(source, 'index.css');
const write = args.includes('--write');
const all = args.includes('--include-features');
const includeReviewed = args.includes('--include-reviewed');
const output = path.resolve(option('--output') ?? path.join(root, 'centralized-ui-preview'));
if (args.includes('--help')) {
    console.log('node centralize-remaining-ui.mjs [--root PATH] [--include-features] [--include-reviewed] [--output PATH]');
    console.log('Default scope: src/components outside reviewed ui/. --include-features also scans src/features and src/pages. Preview only.');
    process.exit(0);
}
if (!fs.existsSync(cssPath) || !fs.existsSync(path.join(frontend, 'package.json'))) throw Error('Run from your fullstack_blueprint root.');
const req = createRequire(path.join(frontend, 'package.json'));
const ts = req('typescript');
const tw = req('tailwindcss');
if (!tw.__unstable__loadDesignSystem || !tw.compile) throw Error('This migration requires the installed Tailwind CSS v4 compiler. Run npm ci in frontend.');
const tailwindDir = path.dirname(req.resolve('tailwindcss/package.json'));
const originalCss = fs.readFileSync(cssPath, 'utf8');
if (!originalCss.includes('.ui-button {') || !originalCss.includes('.ui-card {')) throw Error(`Missing canonical button/card recipes in ${cssPath}. Extract the cumulative replacement ZIP into the repository root first.`);
if (write) throw Error('This migration is preview-only: review migration-report.json, then copy approved source and CSS files together.');
if (fs.existsSync(output) && fs.readdirSync(output).length) throw Error(`Preview directory ${output} already exists; choose a new --output path to prevent stale files.`);
const loader = async (id, base) => {
    const resolved = id === 'tailwindcss' ? path.join(tailwindDir, 'index.css') : id.startsWith('.') || path.isAbsolute(id) ? path.resolve(base, id) : req.resolve(id);
    return { path: resolved, base: path.dirname(resolved), content: fs.readFileSync(resolved, 'utf8') };
};
const opts = { base: path.dirname(cssPath), loadStylesheet: loader };
const ds = await tw.__unstable__loadDesignSystem(originalCss, opts);
const candidateCache = new Map();
const valid = (name) => {
    if (!candidateCache.has(name)) candidateCache.set(name, !!ds.candidatesToCss([name])[0]);
    return candidateCache.get(name);
};
const hash = s => createHash('sha256').update(s).digest('hex');
const kebab = s => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
const marker = s => /^(?:group|peer)(?:\/.*)?$|^@container(?:\/.*)?$/.test(s);
// Keep local structural layout, accessibility and already semantic one-off roles in JSX.
const structural = /^(?:block|inline|inline-block|flex|inline-flex|grid|inline-grid|contents|hidden|relative|absolute|fixed|sticky|static|isolate|isolation-auto|sr-only|not-sr-only|w-full|h-full|size-full|min-w-0|min-h-0|max-w-full|w-auto|h-auto|flex-1|flex-auto|flex-none|flex-col|flex-row|flex-wrap|flex-nowrap|shrink(?:-0)?|grow(?:-0)?|items-[\w-]+|justify-[\w-]+|self-[\w-]+|overflow-[\w-]+|truncate|whitespace-[\w-]+|break-[\w-]+|pointer-events-[\w-]+|col-span-\d+|row-span-\d+)$/;
const lastUtility = s => {
    let square = 0, paren = 0, escaped = false, start = 0;
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (escaped) { escaped = false; continue; }
        if (ch === '\\') { escaped = true; continue; }
        if (ch === '[') square++; else if (ch === ']') square--;
        else if (ch === '(') paren++; else if (ch === ')') paren--;
        else if (ch === ':' && !square && !paren) start = i + 1;
    }
    return [s.slice(0,start),s.slice(start)];
};
const spacing = { '1':'xxs', '2':'xs', '3':'sm', '4':'md', '6':'lg', '8':'xl', '10':'xxl', '16':'3xl', '24':'4xl', '32':'section' };
function normalize(token) {
    const [prefix,utility] = lastUtility(token);
    const match = utility.match(/^(-?)(p[trblxyse]?|m[trblxyse]?|gap(?:-[xy])?|space-[xy])-(1|2|3|4|6|8|10|16|24|32)(!?)$/);
    if (!match) return token;
    const next = prefix + match[1] + match[2] + '-ui-' + spacing[match[3]] + match[4];
    return valid(next) ? next : token;
}
const semantic = /^(?:text-(?:display-(?:xl|lg|md|sm)|page-title|body-(?:lg|md|sm)|label-sm|button-(?:lg|md)|mono-eyebrow|code|muted-foreground|foreground|primary(?:-foreground)?|card-foreground|destructive-deep|success-deep|warning-deep|link-text)|bg-(?:card|background|primary|secondary|muted|accent|popover)|border-(?:border|input)|rounded-(?:sm|md|lg|xl|full|pill|pill-category)|shadow-(?:overlay|raised)|(?:-?p[trblxyse]?|-?m[trblxyse]?|gap(?:-[xy])?|space-[xy])-ui-[\w-]+|font-(?:mono|sans|display)|form-control|control-focus|content-link|page-gutters|modal-backdrop|modal-surface|floating-surface)$/;
const report = { scope: all ? 'components, features and pages' : 'shared components', mode: write ? 'write' : 'preview', filesScanned: 0, skippedReviewed: 0, filesChanged: [], recipes: [], review: [], validation: {} };
const reviewKeys = new Set();
function review(file, sf, node, reason) {
    const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
    const key = `${file}:${line}:${reason}`;
    if (reviewKeys.has(key)) return;
    reviewKeys.add(key); report.review.push({ file, line, reason });
}
const recipes = new Map();
const reserved = new Set([...originalCss.matchAll(/\.([a-zA-Z][\w-]*)\b/g)].map(m=>m[1]));
const files = [];
function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
        const full=path.join(dir,entry.name);
        if (entry.isDirectory() && !['generated','node_modules','__tests__'].includes(entry.name)) walk(full);
        else if (entry.isFile() && /\.tsx?$/.test(entry.name) && !/\.(test|stories|spec|d)\.tsx?$/.test(entry.name)) files.push(full);
    }
}
for (const dir of all ? ['components','features','pages'] : ['components']) walk(path.join(source,dir));
const changes = new Map();
function owner(node,sf,relative) {
    let nearestSlot,tag,fn,variable,property;
    for (let cur=node.parent;cur;cur=cur.parent) {
        if (!tag && (ts.isJsxOpeningElement(cur)||ts.isJsxSelfClosingElement(cur))) {
            tag = cur.tagName.getText(sf).split('.').at(-1);
            const slot = cur.attributes.properties.find(a=>ts.isJsxAttribute(a)&&a.name.getText(sf)==='data-slot'&&a.initializer&&ts.isStringLiteral(a.initializer));
            nearestSlot = slot?.initializer?.text;
        }
        if (!property && ts.isPropertyAssignment(cur)) property = cur.name.getText(sf).replace(/^["']|["']$/g,'');
        if (!fn && ts.isFunctionDeclaration(cur) && cur.name) fn=cur.name.text;
        if (!variable && ts.isVariableDeclaration(cur) && ts.isIdentifier(cur.name)) variable=cur.name.text;
    }
    const base=kebab(path.basename(relative,path.extname(relative)));
    return 'ui-auto-'+[base,nearestSlot || fn || variable,property && property!=='className' ? property : undefined,nearestSlot ? undefined : tag].filter(Boolean).map(kebab).filter((x,i,a)=>a.indexOf(x)===i).join('-');
}
function recipeName(base, candidates) {
    // Keep contextual recipes separate for cascade review.
    const key = [...new Set(candidates)].sort().join(' ');
    let name=base; if (reserved.has(name)) name=`${base}-${hash(key).slice(0,7)}`;
    while(reserved.has(name)) name+='-x';
    reserved.add(name);recipes.set(name,{candidates:[...new Set(candidates)],key});return name;
}
for (const file of files) {
    const relative=path.relative(root,file).split(path.sep).join('/');
    if (!includeReviewed && relative.startsWith("frontend/src/components/ui/")) { report.skippedReviewed++; continue; }
    report.filesScanned++;
    const text=fs.readFileSync(file,'utf8');
    const sf=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
    if (sf.parseDiagnostics.length) { review(relative,sf,sf,'Source already has parser errors; skipped'); continue; }
    const edits=new Map();
    const processed=new Set();
    function literal(node) {
        if (processed.has(node)) return; processed.add(node);
        const raw=node.text;
        if (typeof raw!=='string'||!raw.trim()) return;
        const tokens=raw.trim().split(/\s+/);
        // Leave unusual escaped CSS/Tailwind strings unchanged for human review.
        if (/\\|[\n\r]/.test(raw)) { review(relative,sf,node,'Escaped or multiline class expression; manual review'); return; }
        const move=[], keep=[];
        for(const original of tokens) {
            if(marker(original)||structural.test(lastUtility(original)[1])||original.startsWith('ui-')) { keep.push(original);continue; }
            if(!valid(original)) {
                keep.push(original);
                if(/(?:^|:)(?:animate-in|animate-out|fade-(?:in|out)-|zoom-(?:in|out)-|slide-(?:in-from|out-to)-)/.test(original)) review(relative,sf,node,`Undefined or unavailable animation utility: ${original}`);
                else if(/[:\[\]]/.test(original)) review(relative,sf,node,`Non-resolved class or external selector: ${original}`);
                continue;
            }
            move.push(normalize(original));
        }
        if (!move.length) return;
        // A single canonical semantic utility already references index.css directly.
        if(move.length===1 && semantic.test(lastUtility(move[0])[1])) {
            if(move[0]===tokens.find(t=>!keep.includes(t))) return;
            const next=[...keep,move[0]].join(' ');
            edits.set(node.getStart(sf),{start:node.getStart(sf),end:node.end,text:JSON.stringify(next)});return;
        }
        const name=recipeName(owner(node,sf,relative),move);
        const next=[...keep,name].join(' ');
        edits.set(node.getStart(sf),{start:node.getStart(sf),end:node.end,text:JSON.stringify(next)});
    }
    function classExpression(expr) {
        if(!expr)return;
        if(ts.isStringLiteral(expr)||ts.isNoSubstitutionTemplateLiteral(expr)){literal(expr);return;}
        if(ts.isParenthesizedExpression(expr)){classExpression(expr.expression);return;}
        if(ts.isConditionalExpression(expr)){classExpression(expr.whenTrue);classExpression(expr.whenFalse);return;}
        if(ts.isBinaryExpression(expr)) {
            const op=expr.operatorToken.kind;
            if(op===ts.SyntaxKind.AmpersandAmpersandToken){classExpression(expr.right);return;}
            if(op===ts.SyntaxKind.BarBarToken||op===ts.SyntaxKind.QuestionQuestionToken){classExpression(expr.left);classExpression(expr.right);return;}
            review(relative,sf,expr,'Dynamic class concatenation; manual review');return;
        }
        if(ts.isArrayLiteralExpression(expr)){for(const e of expr.elements)classExpression(e);return;}
        if(ts.isObjectLiteralExpression(expr)){
            for(const prop of expr.properties) if(ts.isPropertyAssignment(prop)&&ts.isStringLiteral(prop.name))literal(prop.name,true);
            return;
        }
        if(ts.isCallExpression(expr)){
            if(/^(?:cn|clsx|twMerge)$/.test(expr.expression.getText(sf)))for(const a of expr.arguments)classExpression(a);
            return;
        }
        if(ts.isTemplateExpression(expr)){
            // Only convert static chunks separated from expressions by whitespace.
            // Rebuild using the original expressions; preserve the exact dynamic values.
            const chunks=[expr.head,...expr.templateSpans.map(x=>x.literal)];
            if(chunks.some((x,i)=>i<chunks.length-1&&!/\s$/.test(x.text)&&x.text.length || i>0&&!/^\s/.test(x.text)&&x.text.length)){
                review(relative,sf,expr,'Interpolated utility name or adjoining template expression; manual review');return;
            }
            // Templates often contain existing semantic CSS classes; leave these simple strings intact.
            if(chunks.some(x=>x.text.trim().split(/\s+/).some(c=>valid(c)&&!structural.test(lastUtility(c)[1])&&!semantic.test(lastUtility(c)[1]))))review(relative,sf,expr,'Template contains static visual utilities; convert to cn() and rerun');
            return;
        }
        if(ts.isArrowFunction(expr)||ts.isFunctionExpression(expr)){
            if(!ts.isBlock(expr.body))classExpression(expr.body);
            else review(relative,sf,expr,'Class callback body; manual review');
            return;
        }
        if(ts.isElementAccessExpression(expr)||ts.isPropertyAccessExpression(expr))review(relative,sf,expr,'Class map or external class reference; review declaration');
        // Identifiers including className are preserved: they may be external overrides.
    }
    function variantTree(node) {
        if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)){literal(node);return;}
        if(ts.isObjectLiteralExpression(node))for(const p of node.properties)if(ts.isPropertyAssignment(p))variantTree(p.initializer);
        if(ts.isArrayLiteralExpression(node))for(const e of node.elements)variantTree(e);
    }
    function visit(node) {
        if(ts.isJsxAttribute(node)&&node.initializer){
            const name=node.name.getText(sf);
            if(name==='className')classExpression(ts.isJsxExpression(node.initializer)?node.initializer.expression:node.initializer);
            if(name==='classNames'&&ts.isJsxExpression(node.initializer)&&node.initializer.expression&&ts.isObjectLiteralExpression(node.initializer.expression))for(const p of node.initializer.expression.properties)if(ts.isPropertyAssignment(p))classExpression(p.initializer);
            if(name==='style'&&ts.isJsxExpression(node.initializer)&&node.initializer.expression)review(relative,sf,node,'Inline style: confirm runtime geometry or semantic CSS references');
        }
        if(ts.isCallExpression(node)){
            const name=node.expression.getText(sf);
            if(/^(?:cn|clsx|twMerge)$/.test(name))for(const a of node.arguments)classExpression(a);
            if(name==='cva'){
                classExpression(node.arguments[0]);
                const config=node.arguments[1];
                if(config&&ts.isObjectLiteralExpression(config))for(const prop of config.properties){
                    if(!ts.isPropertyAssignment(prop))continue;
                    const key=prop.name.getText(sf).replace(/["']/g,'');
                    if(key==='variants')variantTree(prop.initializer);
                    if(key==='compoundVariants'&&ts.isArrayLiteralExpression(prop.initializer))for(const item of prop.initializer.elements)if(ts.isObjectLiteralExpression(item))for(const p of item.properties)if(ts.isPropertyAssignment(p)&&/^(?:class|className)$/.test(p.name.getText(sf).replace(/["']/g,'')))classExpression(p.initializer);
                }
            }
        }
        if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&/ClassName$|Classes$/.test(node.name.text)&&node.initializer&&(ts.isStringLiteral(node.initializer)||ts.isNoSubstitutionTemplateLiteral(node.initializer)))literal(node.initializer);
        ts.forEachChild(node,visit);
    }
    visit(sf);
    if(!edits.size)continue;
    let next=text;
    for(const e of [...edits.values()].sort((a,b)=>b.start-a.start))next=next.slice(0,e.start)+e.text+next.slice(e.end);
    const result=ts.createSourceFile(file,next,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
    if(result.parseDiagnostics.length)throw Error(`Generated invalid TypeScript: ${relative}; no files written.`);
    changes.set(relative,next);report.filesChanged.push({file:relative,edits:edits.size,originalSha256:hash(text)});
}
let nextCss=originalCss;
if(recipes.size){
    nextCss+='\n/* Additional shared component recipes — review and consolidate equivalent roles. */\n@layer components {\n';
    for(const [name,recipe] of recipes){nextCss+=`    .${name} { @apply ${recipe.candidates.join(' ')}; }\n`;report.recipes.push({name,utilities:recipe.candidates});}
    nextCss+='}\n';
}
// Validate the complete stylesheet with the repository's own locked Tailwind compiler.
const compiled=await tw.compile(nextCss,opts);
compiled.build([...candidateCache.keys()].filter(valid));
report.validation={typescriptSyntax:'passed for changed files',tailwindCompilation:'passed',fullTypecheck:'not run',browserAndVisualTests:'not run'};
if(nextCss!==originalCss)changes.set('frontend/src/index.css',nextCss);
// Always save a preview + report; --write also replaces actual files after all checks.
fs.mkdirSync(output,{recursive:true});
for(const [relative,content] of changes){const target=path.join(output,relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content);}
fs.writeFileSync(path.join(output,'migration-report.json'),JSON.stringify(report,null,2)+'\n');
if(write){
    for(const item of report.filesChanged){const actual=path.join(root,item.file);if(hash(fs.readFileSync(actual,'utf8'))!==item.originalSha256)throw Error(`Concurrent change in ${item.file}. Review preview; no source files written.`);}
    if(fs.readFileSync(cssPath,'utf8')!==originalCss)throw Error('index.css changed concurrently; review preview.');
    for(const [relative,content] of changes)fs.writeFileSync(path.join(root,relative),content);
}
console.log(`${report.filesScanned} source files scanned; ${report.filesChanged.length} changed; ${recipes.size} recipes; ${report.review.length} manual-review notices.`);
console.log(`Tailwind compilation + changed-file TS syntax checks passed. ${write?'Changes written.':'Preview only, source files unchanged.'}`);
console.log(`Review ${path.join(output,'migration-report.json')}; run design:check, lint, typecheck, tests, build, and visual QA before merging.`);
