import { useState } from "react";
import { Check, Copy, ExternalLink, RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { CodeViewer } from "../../../components/ui/CodeViewer";
import { MarkdownRenderer } from "../../../components/ui/MarkdownRenderer";
import { cn } from "../../../lib/utils";
import type { AiArtifact, AiCitation, AiMessage, AiToolCall } from "./types";

export function SourceCitations({ citations }: { citations: AiCitation[] }) {
    if (!citations.length) return null;

    return (
        <aside aria-label="Sources" className="mt-ui-sm flex flex-col gap-ui-xxs rounded-lg border border-border bg-muted/20 p-ui-xs">
            <p className="text-body-sm font-semibold uppercase tracking-wide text-muted-foreground">Sources</p>
            {citations.map((citation) => (
                <div key={citation.id} className="flex items-start gap-ui-xs text-body-sm">
                    <CitationLink citation={citation} />
                    {citation.snippet ? <span className="text-muted-foreground">{citation.snippet}</span> : null}
                </div>
            ))}
        </aside>
    );
}

function CitationLink({ citation }: { citation: AiCitation }) {
    const href = safeHttpUrl(citation.url);
    if (!href) return <span className="font-medium">{citation.title}</span>;

    return (
        <a className="content-link inline-flex min-w-0 items-center gap-ui-xxs" href={href} target="_blank" rel="noreferrer">
            <span className="truncate">{citation.title}</span>
            <ExternalLink className="size-(--icon-size-sm) shrink-0" />
        </a>
    );
}

function MessageActions({ content, onRetry, onRegenerate }: { content: string; onRetry?: () => void; onRegenerate?: () => void }) {
    const [copied, setCopied] = useState(false);

    async function copyMessage() {
        if (!navigator.clipboard) return;
        await navigator.clipboard.writeText(content);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
    }

    return (
        <div className="mt-ui-xs flex gap-ui-xxs">
            <Button type="button" variant="ghost" size="icon" aria-label="Copy message" onClick={() => void copyMessage()}>
                {copied ? <Check className="size-(--icon-size-compact)" /> : <Copy className="size-(--icon-size-compact)" />}
            </Button>
            {onRetry ? <Button type="button" variant="ghost" size="icon" aria-label="Retry message" onClick={onRetry}><RefreshCw className="size-(--icon-size-compact)" /></Button> : null}
            {onRegenerate ? <Button type="button" variant="ghost" size="icon" aria-label="Regenerate response" onClick={onRegenerate}><RefreshCw className="size-(--icon-size-compact)" /></Button> : null}
        </div>
    );
}

function MessageBubble({ message, onRetry, onRegenerate }: { message: AiMessage; onRetry?: (message: AiMessage) => void; onRegenerate?: (message: AiMessage) => void }) {
    const roleLabel = message.role === "assistant" ? "Assistant" : message.role;
    const className = cn("rounded-xl p-ui-md", message.role === "user" ? "ml-8 bg-primary/10" : "mr-8 border border-border bg-card");

    return (
        <article className={className} aria-label={`${message.role} message`}>
            <p className="mb-ui-xs text-body-sm font-semibold uppercase tracking-wide text-muted-foreground">{roleLabel}</p>
            <MessageContent message={message} />
            <SourceCitations citations={message.citations} />
            {!message.streaming ? <MessageActions content={message.content} onRetry={onRetry ? () => onRetry(message) : undefined} onRegenerate={onRegenerate ? () => onRegenerate(message) : undefined} /> : null}
        </article>
    );
}

function MessageContent({ message }: { message: AiMessage }) {
    return (
        <>
            {message.role === "assistant" ? <MarkdownRenderer content={message.content} /> : <p className="whitespace-pre-wrap text-body-md">{message.content}</p>}
            {message.streaming ? <span className="sr-only" aria-live="polite">Assistant is still responding</span> : null}
            {message.streaming ? <span className="mt-ui-xs inline-block size-2 animate-pulse rounded-full bg-primary" aria-hidden="true" /> : null}
        </>
    );
}

export function ConversationHistory({ messages, onRetry, onRegenerate }: { messages: AiMessage[]; onRetry?: (message: AiMessage) => void; onRegenerate?: (message: AiMessage) => void }) {
    return (
        <ol aria-label="Conversation messages" className={cn("flex flex-col gap-ui-md", messages.length > 80 && "max-h-[640px] overflow-auto")}>
            {messages.map((message) => <li key={message.id} className="[content-visibility:auto]"><MessageBubble message={message} onRetry={onRetry} onRegenerate={onRegenerate} /></li>)}
        </ol>
    );
}

export function ToolExecutionStatus({ calls }: { calls: AiToolCall[] }) {
    if (!calls.length) return null;

    return (
        <section aria-label="Tool activity" className="flex flex-col gap-ui-xs rounded-lg border border-border bg-muted/20 p-ui-sm">
            <h3 className="text-body-md font-semibold">Tool activity</h3>
            {calls.map((call) => <ToolCallStatus key={call.id} call={call} />)}
        </section>
    );
}

function ToolCallStatus({ call }: { call: AiToolCall }) {
    const statusClass = call.status === "failed" ? "text-destructive-deep" : call.status === "running" ? "text-primary" : "text-success-deep";
    return (
        <div className="text-body-md">
            <div className="flex items-center justify-between gap-ui-xs"><span>{call.name}</span><span className={statusClass}>{call.status}</span></div>
            <ToolResult output={call.output} />
        </div>
    );
}

function ToolResult({ output }: { output?: unknown }) {
    if (output == null) return null;
    let text: string;
    try {
        text = JSON.stringify(output, null, 2);
    } catch {
        text = "Tool output could not be displayed.";
    }
    return <pre className="mt-ui-xs max-h-48 overflow-auto rounded-lg bg-muted p-ui-xs text-body-sm">{text}</pre>;
}

export function HumanApprovalRequest({ title, description, actionLabel = "Approve", resolved, onResolve }: { title: string; description?: string; actionLabel?: string; resolved?: boolean; onResolve: (approved: boolean) => void }) {
    return (
        <section aria-label={title} className="rounded-lg border border-warning/40 bg-warning-soft p-ui-sm">
            <div className="flex gap-ui-xs">
                <TriangleAlert className="mt-0.5 size-(--icon-size-md) text-warning-foreground" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{title}</h3>
                    {description ? <p className="mt-1 text-body-md text-muted-foreground">{description}</p> : null}
                    <ApprovalActions resolved={resolved} actionLabel={actionLabel} onResolve={onResolve} />
                </div>
            </div>
        </section>
    );
}

function ApprovalActions({ resolved, actionLabel, onResolve }: { resolved?: boolean; actionLabel: string; onResolve: (approved: boolean) => void }) {
    if (resolved != null) return <p className="mt-ui-xs text-body-md font-medium">{resolved ? "Approved" : "Declined"}</p>;
    return (
        <div className="mt-ui-sm flex gap-ui-xs">
            <Button type="button" onClick={() => onResolve(true)}>{actionLabel}</Button>
            <Button type="button" variant="outline" onClick={() => onResolve(false)}>Decline</Button>
        </div>
    );
}

export function ArtifactPreview({ artifact }: { artifact: AiArtifact }) {
    const imageUrl = artifact.contentType === "image" ? safeHttpUrl(artifact.url) : null;
    if (artifact.contentType === "image" && artifact.url && !imageUrl) return <p role="alert" className="text-body-md text-destructive-deep">Unsafe artifact URL was blocked.</p>;
    return <ArtifactContent artifact={artifact} imageUrl={imageUrl} />;
}

function ArtifactContent({ artifact, imageUrl }: { artifact: AiArtifact; imageUrl: string | null }) {
    if (imageUrl) return <figure><img src={imageUrl} alt={artifact.title} loading="lazy" decoding="async" sizes="(max-width: 768px) 100vw, 640px" className="max-h-72 rounded-lg object-contain" /><figcaption className="mt-1 text-body-sm text-muted-foreground">{artifact.title}</figcaption></figure>;
    if (artifact.contentType === "json") return <CodeViewer code={artifact.content ?? ""} language="json" />;
    if (artifact.contentType === "markdown") return <MarkdownRenderer content={artifact.content ?? ""} />;
    return <p className="whitespace-pre-wrap text-body-md">{artifact.content ?? ""}</p>;
}

function safeHttpUrl(value?: string): string | null {
    if (!value) return null;
    try {
        const url = new URL(value, window.location.origin);
        return ["http:", "https:"].includes(url.protocol) ? url.href : null;
    } catch {
        return null;
    }
}
