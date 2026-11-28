import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import { copyTextToClipboard, stringifyPretty } from "./jsonDisplay";

type JsonBlockProps = { data: unknown; showCopy?: boolean; maxHeight?: number };

export function JsonBlock({ data, showCopy = true, maxHeight }: JsonBlockProps) {
    const text = stringifyPretty(data);
    return <div className="ui-json-block">{showCopy ? <Button variant="outline" onClick={() => void copyTextToClipboard(text).then((ok) => notify({ message: ok ? "JSON copied." : "Could not copy JSON.", severity: ok ? "success" : "warning" }))} type="button"><Copy />Copy JSON</Button> : null}<pre className="ui-json-code" style={maxHeight === undefined ? undefined : { maxHeight }}>{text}</pre></div>;
}
