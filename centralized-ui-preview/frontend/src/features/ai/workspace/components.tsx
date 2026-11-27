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
        <aside aria-label="Sources" className="ui-auto-components-source-citations-aside">
            <p className="ui-auto-components-source-citations-p">Sources</p>
            {citations.map((citation) => (
                <div key={citation.id} className="flex items-start ui-auto-components-source-citations-div">
                    <CitationLink citation={citation} />
                    {citation.snippet ? <span className="text-muted-foreground">{citation.snippet}</span> : null}
                </div>
            ))}
        </aside>
    );
}

function CitationLink({ citation }: { citation: AiCitation }) {
    const href = safeHttpUrl(citation.url);
    if (!href) return <span className="ui-auto-components-citation-link-span">{citation.title}</span>;

    return (
        <a className="inline-flex min-w-0 items-center ui-auto-components-citation-link-a" href={href} target="_blank" rel="noreferrer">
            <span className="truncate">{citation.title}</span>
            <ExternalLink className="shrink-0 ui-auto-components-citation-link-external-link" />
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
        <div className="flex ui-auto-components-message-actions-div">
            <Button type="button" variant="ghost" size="icon" aria-label="Copy message" onClick={() => void copyMessage()}>
                {copied ? <Check className="ui-auto-components-message-actions-check" /> : <Copy className="ui-auto-components-message-actions-copy" />}
            </Button>
            {onRetry ? <Button type="button" variant="ghost" size="icon" aria-label="Retry message" onClick={onRetry}><RefreshCw className="ui-auto-components-message-actions-refresh-cw" /></Button> : null}
            {onRegenerate ? <Button type="button" variant="ghost" size="icon" aria-label="Regenerate response" onClick={onRegenerate}><RefreshCw className="ui-auto-components-message-actions-refresh-cw-61c000c" /></Button> : null}
        </div>
    );
}

function MessageBubble({ message, onRetry, onRegenerate }: { message: AiMessage; onRetry?: (message: AiMessage) => void; onRegenerate?: (message: AiMessage) => void }) {
    const roleLabel = message.role === "assistant" ? "Assistant" : message.role;
    const className = cn("ui-auto-components-message-bubble", message.role === "user" ? "ui-auto-components-message-bubble-6ab915b" : "ui-auto-components-message-bubble-e9e1c93");

    return (
        <article className={className} aria-label={`${message.role} message`}>
            <p className="ui-auto-components-message-bubble-p">{roleLabel}</p>
            <MessageContent message={message} />
            <SourceCitations citations={message.citations} />
            {!message.streaming ? <MessageActions content={message.content} onRetry={onRetry ? () => onRetry(message) : undefined} onRegenerate={onRegenerate ? () => onRegenerate(message) : undefined} /> : null}
        </article>
    );
}

function MessageContent({ message }: { message: AiMessage }) {
    return (
        <>
            {message.role === "assistant" ? <MarkdownRenderer content={message.content} /> : <p className="whitespace-pre-wrap ui-auto-components-message-content-p">{message.content}</p>}
            {message.streaming ? <span className="sr-only" aria-live="polite">Assistant is still responding</span> : null}
            {message.streaming ? <span className="inline-block ui-auto-components-message-content-span" aria-hidden="true" /> : null}
        </>
    );
}

export function ConversationHistory({ messages, onRetry, onRegenerate }: { messages: AiMessage[]; onRetry?: (message: AiMessage) => void; onRegenerate?: (message: AiMessage) => void }) {
    return (
        <ol aria-label="Conversation messages" className={cn("space-y-ui-md", messages.length > 80 && "overflow-auto ui-auto-components-conversation-history-ol")}>
            {messages.map((message) => <li key={message.id} className="ui-auto-components-conversation-history-li"><MessageBubble message={message} onRetry={onRetry} onRegenerate={onRegenerate} /></li>)}
        </ol>
    );
}

export function ToolExecutionStatus({ calls }: { calls: AiToolCall[] }) {
    if (!calls.length) return null;

    return (
        <section aria-label="Tool activity" className="ui-auto-components-tool-execution-status-section">
            <h3 className="ui-auto-components-tool-execution-status-h3">Tool activity</h3>
            {calls.map((call) => <ToolCallStatus key={call.id} call={call} />)}
        </section>
    );
}

function ToolCallStatus({ call }: { call: AiToolCall }) {
    const statusClass = call.status === "failed" ? "text-destructive-deep" : call.status === "running" ? "text-primary" : "text-success-deep";
    return (
        <div className="ui-auto-components-tool-call-status-div">
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
    return <pre className="overflow-auto ui-auto-components-tool-result-pre">{text}</pre>;
}

export function HumanApprovalRequest({ title, description, actionLabel = "Approve", resolved, onResolve }: { title: string; description?: string; actionLabel?: string; resolved?: boolean; onResolve: (approved: boolean) => void }) {
    return (
        <section aria-label={title} className="ui-auto-components-human-approval-request-section">
            <div className="flex gap-ui-xs">
                <TriangleAlert className="ui-auto-components-human-approval-request-triangle-alert" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                    <h3 className="ui-auto-components-human-approval-request-h3">{title}</h3>
                    {description ? <p className="ui-auto-components-human-approval-request-p">{description}</p> : null}
                    <ApprovalActions resolved={resolved} actionLabel={actionLabel} onResolve={onResolve} />
                </div>
            </div>
        </section>
    );
}

function ApprovalActions({ resolved, actionLabel, onResolve }: { resolved?: boolean; actionLabel: string; onResolve: (approved: boolean) => void }) {
    if (resolved != null) return <p className="ui-auto-components-approval-actions-p">{resolved ? "Approved" : "Declined"}</p>;
    return (
        <div className="flex ui-auto-components-approval-actions-div">
            <Button type="button" onClick={() => onResolve(true)}>{actionLabel}</Button>
            <Button type="button" variant="outline" onClick={() => onResolve(false)}>Decline</Button>
        </div>
    );
}

export function ArtifactPreview({ artifact }: { artifact: AiArtifact }) {
    const imageUrl = artifact.contentType === "image" ? safeHttpUrl(artifact.url) : null;
    if (artifact.contentType === "image" && artifact.url && !imageUrl) return <p role="alert" className="ui-auto-components-artifact-preview-p">Unsafe artifact URL was blocked.</p>;
    return <ArtifactContent artifact={artifact} imageUrl={imageUrl} />;
}

function ArtifactContent({ artifact, imageUrl }: { artifact: AiArtifact; imageUrl: string | null }) {
    if (imageUrl) return <figure><img src={imageUrl} alt={artifact.title} loading="lazy" decoding="async" sizes="(max-width: 768px) 100vw, 640px" className="ui-auto-components-artifact-content-img" /><figcaption className="ui-auto-components-artifact-content-figcaption">{artifact.title}</figcaption></figure>;
    if (artifact.contentType === "json") return <CodeViewer code={artifact.content ?? ""} language="json" />;
    if (artifact.contentType === "markdown") return <MarkdownRenderer content={artifact.content ?? ""} />;
    return <p className="whitespace-pre-wrap ui-auto-components-artifact-content-p">{artifact.content ?? ""}</p>;
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
