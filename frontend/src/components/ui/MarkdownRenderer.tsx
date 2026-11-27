import { Fragment, useMemo } from "react";
/** Deliberately safe, dependency-free Markdown subset for trusted display text. */
export function MarkdownRenderer({ content, className }: { content: string; className?: string }) {
    const blocks = useMemo(() => content.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean), [content]);
    return <div className={className ?? "ui-markdown"}>{blocks.map((block, index) => renderMarkdownBlock(block, index))}</div>;
}
function renderMarkdownBlock(block: string, key: number) {
    if (block.startsWith("### ")) return <h3 key={key} className="text-display-sm">{block.slice(4)}</h3>;
    if (block.startsWith("## ")) return <h2 key={key} className="text-display-md">{block.slice(3)}</h2>;
    if (block.startsWith("# ")) return <h1 key={key} className="text-display-lg">{block.slice(2)}</h1>;
    if (block.startsWith("```")) return <pre key={key} className="ui-markdown-code text-code">{block.replace(/^```\w*\n?/, "").replace(/```$/, "")}</pre>;
    const lines = block.split("\n");
    return <p key={key}>{lines.map((line, index) => <Fragment key={index}>{line}{index < lines.length - 1 ? <br /> : null}</Fragment>)}</p>;
}
