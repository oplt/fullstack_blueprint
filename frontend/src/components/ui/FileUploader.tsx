import { useEffect, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "./button";

export function FileUploader({ files = [], onFilesChange, accept, multiple = false, maxFiles = multiple ? 10 : 1, maxSizeBytes = 25 * 1024 * 1024, disabled = false }: { files?: File[]; onFilesChange: (files: File[]) => void; accept?: string; multiple?: boolean; maxFiles?: number; maxSizeBytes?: number; disabled?: boolean }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);
    const addFiles = (incoming: FileList | File[]) => {
        const next = Array.from(incoming);
        const accepted = accept?.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
        const invalidType = accepted?.length ? next.find((file) => !accepted.some((type) => type.startsWith(".") ? file.name.toLowerCase().endsWith(type) : type.endsWith("/*") ? file.type.startsWith(type.slice(0, -1)) : file.type === type)) : undefined;
        if (invalidType) { setError(`${invalidType.name} is not an accepted file type.`); return; }
        const tooLarge = next.find((file) => file.size > maxSizeBytes);
        if (tooLarge) { setError(`${tooLarge.name} is larger than the allowed limit.`); return; }
        setError(null);
        onFilesChange((multiple ? [...files, ...next] : next).slice(0, maxFiles));
    };
    return (
        <div className="space-y-2"><button type="button" disabled={disabled} className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center hover:bg-muted/40 disabled:opacity-50" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addFiles(event.dataTransfer.files); }}><Upload className="size-5 text-muted-foreground" /><span className="text-sm font-medium">Choose {multiple ? "files" : "a file"} or drag them here</span><span className="text-xs text-muted-foreground">{accept ?? "Any supported file"} · up to {Math.round(maxSizeBytes / 1024 / 1024)} MB</span></button><input ref={inputRef} className="sr-only" type="file" accept={accept} multiple={multiple} disabled={disabled} onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = ""; }} />{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}{files.length ? <ul className="space-y-1" aria-label="Selected files">{files.map((file, index) => <li key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"><span className="min-w-0 truncate">{file.name}</span><Button
            type="button"
            variant="ghost"
            aria-label={`Remove ${file.name}`}
            onClick={() => onFilesChange(files.filter((_item, itemIndex) => itemIndex !== index))}><X className="size-4" /></Button></li>)}</ul> : null}</div>
    );
}

export function FilePreview({ file, className }: { file: File; className?: string }) {
    const [url] = useState(() => URL.createObjectURL(file));
    useEffect(() => () => URL.revokeObjectURL(url), [url]);
    if (file.type.startsWith("image/")) return <img src={url} alt={file.name} className={className ?? "max-h-48 rounded-lg object-contain"} />;
    return <div className={className ?? "rounded-lg border border-border p-3 text-sm"}>{file.name} · {Math.ceil(file.size / 1024)} KB</div>;
}
