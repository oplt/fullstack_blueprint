import { useState } from "react";
import { Check, Copy, ExternalLink, Paperclip, RefreshCw, Square, TriangleAlert } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { CodeViewer } from "../../../components/ui/CodeViewer";
import { FileUploader } from "../../../components/ui/FileUploader";
import { MarkdownRenderer } from "../../../components/ui/MarkdownRenderer";
import { Textarea } from "../../../components/ui/textarea";
import { cn } from "../../../lib/utils";
import { VirtualizedList } from "../../../components/ui/VirtualizedList";
import type { AiArtifact, AiCitation, AiMessage, AiToolCall, AiUsage } from "./types";

export type AiConversation = { id: string; title: string; updatedAt?: string };

export function ConversationSidebar({ conversations, activeId, onSelect, onNew }: { conversations: AiConversation[]; activeId?: string; onSelect: (id: string) => void; onNew?: () => void }) {
    return (
        <aside aria-label="Conversations" className="flex min-h-0 flex-col gap-2 border-r border-border p-3"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Conversations</h2>{onNew ? <Button
                type="button"
                variant="outline"
                aria-label="New conversation"
                onClick={onNew}>+</Button> : null}</div><nav className="min-h-0 space-y-1 overflow-auto">{conversations.map((conversation) => <button type="button" key={conversation.id} aria-current={conversation.id === activeId ? "page" : undefined} onClick={() => onSelect(conversation.id)} className={cn("w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted", conversation.id === activeId && "bg-primary/10 font-medium text-primary")}><span className="block truncate">{conversation.title}</span>{conversation.updatedAt ? <time className="text-xs text-muted-foreground">{conversation.updatedAt}</time> : null}</button>)}</nav></aside>
    );
}

export function SourceCitations({ citations }: { citations: AiCitation[] }) {
    if (!citations.length) return null;
    return <aside aria-label="Sources" className="mt-3 space-y-1 rounded-lg border border-border bg-muted/20 p-2"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sources</p>{citations.map((citation) => { const href = citation.url && (() => { try { const url = new URL(citation.url, window.location.origin); return ["http:", "https:"].includes(url.protocol) ? url.href : undefined; } catch { return undefined; } })(); return <div key={citation.id} className="flex items-start gap-2 text-xs">{href ? <a className="inline-flex min-w-0 items-center gap-1 text-primary hover:underline" href={href} target="_blank" rel="noreferrer"><span className="truncate">{citation.title}</span><ExternalLink className="size-3 shrink-0" /></a> : <span className="font-medium">{citation.title}</span>}{citation.snippet ? <span className="text-muted-foreground">{citation.snippet}</span> : null}</div>; })}</aside>;
}

export function MessageActions({ content, onRetry, onRegenerate }: { content: string; onRetry?: () => void; onRegenerate?: () => void }) {
    const [copied, setCopied] = useState(false);
    return (
        <div className="mt-2 flex gap-1"><Button
                type="button"
                variant="ghost"
                aria-label="Copy message"
                onClick={() => { void navigator.clipboard?.writeText(content).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1200); }); }}>{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}</Button>{onRetry ? <Button
                type="button"
                variant="ghost"
                aria-label="Retry message"
                onClick={onRetry}><RefreshCw className="size-3.5" /></Button> : null}{onRegenerate ? <Button
                type="button"
                variant="ghost"
                aria-label="Regenerate response"
                onClick={onRegenerate}><RefreshCw className="size-3.5" /></Button> : null}</div>
    );
}

function MessageBubble({ message, onRetry, onRegenerate }: { message: AiMessage; onRetry?: (message: AiMessage) => void; onRegenerate?: (message: AiMessage) => void }) {
    return <article className={cn("rounded-xl p-4", message.role === "user" ? "ml-8 bg-primary/10" : "mr-8 border border-border bg-card")} aria-label={`${message.role} message`}><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{message.role === "assistant" ? "Assistant" : message.role}</p>{message.role === "assistant" ? <MarkdownRenderer content={message.content} /> : <p className="whitespace-pre-wrap text-sm">{message.content}</p>}{message.streaming ? <span className="sr-only" aria-live="polite">Assistant is still responding</span> : null}{message.streaming ? <span className="mt-2 inline-block size-2 animate-pulse rounded-full bg-primary" aria-hidden="true" /> : null}<SourceCitations citations={message.citations} />{!message.streaming ? <MessageActions content={message.content} onRetry={onRetry ? () => onRetry(message) : undefined} onRegenerate={onRegenerate ? () => onRegenerate(message) : undefined} /> : null}</article>;
}

export function ConversationHistory({ messages, onRetry, onRegenerate }: { messages: AiMessage[]; onRetry?: (message: AiMessage) => void; onRegenerate?: (message: AiMessage) => void }) {
    const render = (message: AiMessage) => <MessageBubble message={message} onRetry={onRetry} onRegenerate={onRegenerate} />;
    return <div aria-label="Conversation messages" className="space-y-4">{messages.length > 80 ? <VirtualizedList items={messages} itemKey={(message) => message.id} estimatedItemHeight={180} ariaLabel="Conversation messages" renderItem={render} /> : messages.map((message) => <MessageBubble key={message.id} message={message} onRetry={onRetry} onRegenerate={onRegenerate} />)}</div>;
}

export function MessageComposer({ onSubmit, onStop, disabled = false, supportsAttachments = true }: { onSubmit: (content: string, attachments: File[]) => void; onStop?: () => void; disabled?: boolean; supportsAttachments?: boolean }) {
    const [value, setValue] = useState("");
    const [attachments, setAttachments] = useState<File[]>([]);
    const submit = () => { const content = value.trim(); if (!content && !attachments.length) return; onSubmit(content, attachments); setValue(""); setAttachments([]); };
    return <form className="space-y-2 rounded-xl border border-border bg-card p-3" onSubmit={(event) => { event.preventDefault(); submit(); }}><Textarea value={value} onChange={(event) => setValue(event.target.value)} disabled={disabled} placeholder="Ask a question…" aria-label="Message composer" rows={3} onKeyDown={(event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); submit(); } }} />{supportsAttachments ? <FileUploader files={attachments} onFilesChange={setAttachments} multiple maxFiles={5} maxSizeBytes={20 * 1024 * 1024} accept="image/*,.pdf,.txt,.md" /> : null}<div className="flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground"><Paperclip className="mr-1 inline size-3" />{attachments.length ? `${attachments.length} attachment(s)` : "Ctrl/Cmd + Enter to send"}</span>{disabled && onStop ? <Button type="button" variant="outline" onClick={onStop}><Square className="mr-2 size-3.5" />Stop</Button> : <Button type="submit" disabled={disabled || (!value.trim() && !attachments.length)}>Send</Button>}</div></form>;
}

export function ModelSelector({ models, value, onChange, disabled = false }: { models: Array<{ id: string; label: string }>; value?: string; onChange: (model: string) => void; disabled?: boolean }) { return <label className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">Model</span><select value={value ?? ""} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="h-8 rounded-lg border border-input bg-background px-2"><option value="">Select model</option>{models.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}</select></label>; }

export function ToolExecutionStatus({ calls }: { calls: AiToolCall[] }) { if (!calls.length) return null; return <section aria-label="Tool activity" className="space-y-2 rounded-lg border border-border bg-muted/20 p-3"><h3 className="text-sm font-semibold">Tool activity</h3>{calls.map((call) => <div key={call.id} className="text-sm"><div className="flex items-center justify-between gap-2"><span>{call.name}</span><span className={call.status === "failed" ? "text-destructive" : call.status === "running" ? "text-primary" : "text-emerald-600"}>{call.status}</span></div><ToolResult output={call.output} /></div>)}</section>; }

export function ToolResult({ output }: { output?: unknown }) { if (output == null) return null; const text = (() => { try { return JSON.stringify(output, null, 2); } catch { return "Tool output could not be displayed."; } })(); return <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-muted p-2 text-xs">{text}</pre>; }

export function AgentRunStatus({ status, runId }: { status: string; runId?: string }) { return <p aria-live="polite" className="text-xs text-muted-foreground">Agent run {runId ? `${runId} · ` : ""}{status}</p>; }

export function HumanApprovalRequest({ title, description, actionLabel = "Approve", resolved, onResolve }: { title: string; description?: string; actionLabel?: string; resolved?: boolean; onResolve: (approved: boolean) => void }) { return <section role="alertdialog" aria-label={title} className="rounded-lg border border-amber-400/40 bg-amber-50/50 p-3 dark:bg-amber-950/20"><div className="flex gap-2"><TriangleAlert className="mt-0.5 size-4 text-amber-600" /><div className="min-w-0 flex-1"><h3 className="font-semibold">{title}</h3>{description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}{resolved == null ? <div className="mt-3 flex gap-2"><Button type="button" onClick={() => onResolve(true)}>{actionLabel}</Button><Button type="button" variant="outline" onClick={() => onResolve(false)}>Decline</Button></div> : <p className="mt-2 text-sm font-medium">{resolved ? "Approved" : "Declined"}</p>}</div></div></section>; }

export function UsageIndicator({ usage }: { usage?: AiUsage }) { if (!usage) return null; const tokens = usage.totalTokens ?? ((usage.inputTokens ?? 0) + (usage.outputTokens ?? 0)); return <p className="text-xs text-muted-foreground">{tokens ? `${tokens.toLocaleString()} tokens` : "Usage pending"}{usage.estimatedCostMicros != null ? ` · $${(usage.estimatedCostMicros / 1_000_000).toFixed(4)}` : ""}</p>; }

function safeArtifactUrl(value: string): string | null {
    try {
        const url = new URL(value, window.location.origin);
        return ["http:", "https:"].includes(url.protocol) ? url.href : null;
    } catch {
        return null;
    }
}

export function ArtifactPreview({ artifact }: { artifact: AiArtifact }) {
    const imageUrl = artifact.contentType === "image" && artifact.url ? safeArtifactUrl(artifact.url) : null;
    if (artifact.contentType === "image" && artifact.url && !imageUrl) return <p role="alert" className="text-sm text-destructive">Unsafe artifact URL was blocked.</p>;
    if (imageUrl) return <figure><img src={imageUrl} alt={artifact.title} loading="lazy" decoding="async" sizes="(max-width: 768px) 100vw, 640px" className="max-h-72 rounded-lg object-contain" /><figcaption className="mt-1 text-xs text-muted-foreground">{artifact.title}</figcaption></figure>;
    if (artifact.contentType === "json") return <CodeViewer code={artifact.content ?? ""} language="json" />;
    if (artifact.contentType === "markdown") return <MarkdownRenderer content={artifact.content ?? ""} />;
    return <p className="whitespace-pre-wrap text-sm">{artifact.content ?? ""}</p>;
}

export function AiErrorRecovery({ message, onRetry }: { message: string; onRetry?: () => void }) { return <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><p>{message}</p>{onRetry ? <Button type="button" variant="outline" className="mt-2" onClick={onRetry}>Retry connection</Button> : null}</div>; }

