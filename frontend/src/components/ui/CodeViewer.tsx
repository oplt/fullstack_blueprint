import { Copy } from "lucide-react";
import { Button } from "./button";
export function CodeViewer({ code, language = "text", onCopy }: { code: string; language?: string; onCopy?: (code: string) => void }) {
    return <div className="ui-code-viewer"><div className="ui-code-viewer-header"><span>{language}</span><Button type="button" variant="ghost" aria-label="Copy code" onClick={() => { if (onCopy) onCopy(code); else void navigator.clipboard?.writeText(code); }}><Copy className="ui-code-copy-icon" /></Button></div><pre className="ui-code-viewer-body"><code>{code}</code></pre></div>;
}
