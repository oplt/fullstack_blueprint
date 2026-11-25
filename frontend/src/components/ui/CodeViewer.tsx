import { Copy } from "lucide-react";
import { Button } from "./button";

export function CodeViewer({ code, language = "text", onCopy }: { code: string; language?: string; onCopy?: (code: string) => void }) {
    return (
        <div className="overflow-hidden rounded-lg border border-border"><div className="flex items-center justify-between border-b border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground"><span>{language}</span><Button
            type="button"
            variant="ghost"
            aria-label="Copy code"
            onClick={() => { if (onCopy) onCopy(code); else void navigator.clipboard?.writeText(code); }}><Copy className="size-3.5" /></Button></div><pre className="m-0 max-h-[32rem] overflow-auto bg-muted/20 p-4 font-mono text-xs leading-relaxed"><code>{code}</code></pre></div>
    );
}
