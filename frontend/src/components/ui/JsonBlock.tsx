import { Copy } from "lucide-react";
import { Button } from "./button";
import { useSnackbar } from "../../app/snackbarContext";
import { copyTextToClipboard, stringifyPretty } from "./jsonDisplay";
import { cn } from "@/lib/utils";
type JsonBlockProps = { data: unknown; showCopy?: boolean; maxHeight?: number };
export function JsonBlock({ data, showCopy = true, maxHeight = 420 }: JsonBlockProps) {
    const { showToast } = useSnackbar();
    const text = stringifyPretty(data);
    return <div className="space-y-2">{showCopy ? <Button size="sm" variant="outline" onClick={() => void copyTextToClipboard(text).then((ok) => showToast({ message: ok ? "JSON copied." : "Could not copy JSON.", severity: ok ? "success" : "warning" }))}><Copy className="mr-2 size-4" />Copy JSON</Button> : null}<pre className={cn("m-0 overflow-auto rounded-lg border border-border bg-muted/30 p-4 font-mono text-xs leading-relaxed text-foreground")} style={{ maxHeight }}>{text}</pre></div>;
}
