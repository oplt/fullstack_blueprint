import { useMemo } from "react";

/** Deliberately safe, dependency-free Markdown subset for trusted display text. */
export function MarkdownRenderer({ content, className }: { content: string; className?: string }) {
    const blocks = useMemo(() => content.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean), [content]);
    return <div className={className ?? "space-y-3 text-sm leading-6"}>{blocks.map((block, index) => { if (block.startsWith("### ")) return <h3 key={index} className="font-semibold">{block.slice(4)}</h3>; if (block.startsWith("## ")) return <h2 key={index} className="text-base font-semibold">{block.slice(3)}</h2>; if (block.startsWith("# ")) return <h1 key={index} className="text-lg font-semibold">{block.slice(2)}</h1>; if (block.startsWith("```")) return <pre key={index} className="overflow-auto rounded-lg bg-muted p-3 font-mono text-xs">{block.replace(/^```\w*\n?/, "").replace(/```$/, "")}</pre>; return <p key={index}>{block.split("\n").map((line, lineIndex) => <span key={lineIndex}>{line}{lineIndex < block.split("\n").length - 1 ? <br /> : null}</span>)}</p>; })}</div>;
}

