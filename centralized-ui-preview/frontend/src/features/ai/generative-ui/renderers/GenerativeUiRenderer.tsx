import { useState, type ReactNode } from "react";
import { CheckCircle2, Circle, Download, Workflow } from "lucide-react";
import { ActivityTimeline } from "@/components/ui/ActivityTimeline";
import { ComparisonCard } from "@/components/ui/ComparisonCard";
import { LazyChart } from "@/components/ui/LazyChart";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/button";
import { ReadOnlyTable } from "@/components/ui/ReadOnlyTable";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArtifactPreview, HumanApprovalRequest, SourceCitations } from "../../workspace/components";
import type { AiArtifact, AiCitation } from "../../workspace/types";
import type { ActionContext, ActionDispatcher } from "../actions/actionDispatcher";
import { GENERATIVE_COMPONENT_REGISTRY } from "../registry/registry";
import type { GenerativeAction, GenerativeComponent } from "../schemas";
import { validateGenerativePayload } from "../validation";

export type GenerativeUiRendererProps = { payload: unknown; onAction?: ActionDispatcher; context?: ActionContext; className?: string };

function safeUrl(value?: string): string | undefined {
    if (!value) return undefined;
    try { const url = new URL(value, window.location.origin); return ["http:", "https:"].includes(url.protocol) ? url.href : undefined; } catch { return undefined; }
}

function ActionButton({ action, onAction, context, children }: { action?: GenerativeAction; onAction?: ActionDispatcher; context: ActionContext; children: ReactNode }) {
    if (!action || !onAction) return null;
    return <Button type="button" onClick={() => { void onAction(action, context); }}>{children}</Button>;
}

function ChildComponents({ children, render }: { children?: unknown[]; render: (component: GenerativeComponent) => ReactNode }) {
    return <>{children?.map((child) => { const result = validateGenerativePayload({ version: 1, components: [child] }); return result.success ? <span key={result.data.components[0].id} className="contents">{render(result.data.components[0])}</span> : null; })}</>;
}

function renderValue(value: unknown): string { return value == null ? "" : typeof value === "string" || typeof value === "number" ? String(value) : "[structured value]"; }

function ComponentRenderer({ component, onAction, context }: { component: GenerativeComponent; onAction?: ActionDispatcher; context: ActionContext }): ReactNode {
    const children = (component as GenerativeComponent & { children?: unknown[] }).children;
    switch (component.type) {
        case "text": return <div className="space-y-ui-xs"><p>{component.text}</p><ChildComponents children={children} render={(child) => <ComponentRenderer key={child.id} component={child} onAction={onAction} context={context} />} /></div>;
        case "markdown": return <div className="space-y-ui-xs"><MarkdownRenderer content={component.markdown} /><ChildComponents children={children} render={(child) => <ComponentRenderer key={child.id} component={child} onAction={onAction} context={context} />} /></div>;
        case "metric": return <section className="space-y-ui-xs"><StatCard label={component.label} value={component.value} description={component.description} icon={<span aria-hidden="true">#</span>} color={component.color} /><ChildComponents children={children} render={(child) => <ComponentRenderer key={child.id} component={child} onAction={onAction} context={context} />} /></section>;
        case "data_table": return <section aria-label={component.title ?? "Data table"} className="space-y-ui-xs">{component.title ? <h3 className="ui-auto-generative-ui-renderer-component-renderer-h3">{component.title}</h3> : null}<ReadOnlyTable
            ariaLabel={component.title ?? "Data table"}
            columns={component.columns}
            rows={component.rows}
            renderCell={(row, column) => renderValue(row[column.key])}
        /></section>;
        case "chart": return <LazyChart chartType={component.chartType} title={component.title} description={component.description} data={component.data} xKey={component.xKey} series={component.series} />;
        case "comparison": return <ComparisonCard title={component.title} value={component.value} comparison={component.comparison} description={component.description} />;
        case "checklist": return <section aria-label={component.title ?? "Checklist"} className="space-y-ui-xs"><h3 className="ui-auto-generative-ui-renderer-component-renderer-h3-87e86ce">{component.title}</h3><ul className="space-y-ui-xxs">{component.items.map((item) => <li key={item.id} className="flex items-center gap-ui-xs">{item.completed ? <CheckCircle2 className="ui-auto-generative-ui-renderer-component-renderer-check-circle2" aria-hidden="true" /> : <Circle className="ui-auto-generative-ui-renderer-component-renderer-circle" aria-hidden="true" />}<span className={item.completed ? "ui-auto-generative-ui-renderer-component-renderer-span" : undefined}>{item.label}</span></li>)}</ul></section>;
        case "task_list": return <section aria-label={component.title ?? "Task list"} className="space-y-ui-xs"><h3 className="ui-auto-generative-ui-renderer-component-renderer-h3-87e86ce-x">{component.title}</h3><ul className="space-y-ui-xs">{component.tasks.map((task) => <li key={task.id} className="ui-auto-generative-ui-renderer-component-renderer-li"><div className="flex items-center justify-between gap-ui-xs"><span className="ui-auto-generative-ui-renderer-component-renderer-span-daaac3f">{task.title}</span><span className="ui-auto-generative-ui-renderer-component-renderer-span-6b11140">{task.status}</span></div>{task.description ? <p className="ui-auto-generative-ui-renderer-component-renderer-p">{task.description}</p> : null}</li>)}</ul></section>;
        case "timeline": return <ActivityTimeline items={component.items} />;
        case "citations": return <SourceCitations citations={component.citations as AiCitation[]} />;
        case "file_preview": { const url = safeUrl(component.url); const artifact: AiArtifact = { id: component.id, title: component.title, contentType: component.contentType, content: component.content, url }; return <section className="space-y-ui-xs"><ArtifactPreview artifact={artifact} />{component.url && !url ? <p role="alert" className="ui-auto-generative-ui-renderer-component-renderer-p-b312e6b">Unsafe file URL was blocked.</p> : null}</section>; }
        case "form": return <GeneratedForm component={component} onAction={onAction} context={context} />;
        case "approval_request": return <HumanApprovalRequest title={component.title} description={component.description} actionLabel={component.actionLabel} onResolve={(approved) => { if (approved && onAction) void onAction(component.action, { ...context, componentId: component.id }); }} />;
        case "structured_report": return <article className="space-y-ui-md"><h2 className="ui-auto-generative-ui-renderer-component-renderer-h2">{component.title}</h2>{component.summary ? <MarkdownRenderer content={component.summary} /> : null}{component.sections.map((section) => <section key={section.id} className="space-y-ui-xs"><h3 className="ui-auto-generative-ui-renderer-component-renderer-h3-87e86ce-x-x">{section.title}</h3>{section.body ? <MarkdownRenderer content={section.body} /> : null}<ChildComponents children={section.components} render={(child) => <ComponentRenderer key={child.id} component={child} onAction={onAction} context={context} />} /></section>)}</article>;
        case "workflow_status": return <section aria-live="polite" className="flex items-start ui-auto-generative-ui-renderer-component-renderer-section"><Workflow className="ui-auto-generative-ui-renderer-component-renderer-workflow" aria-hidden="true" /><div><h3 className="ui-auto-generative-ui-renderer-component-renderer-h3-87e86ce-x-x-x">{component.title}</h3><p className="ui-auto-generative-ui-renderer-component-renderer-p-c74ab39">{component.status}</p>{component.detail ? <p className="ui-auto-generative-ui-renderer-component-renderer-p-73383af">{component.detail}</p> : null}</div></section>;
        case "artifact_card": { const artifact: AiArtifact = { id: component.id, title: component.title, contentType: component.contentType, content: component.content, url: safeUrl(component.url) }; return <section className="ui-auto-generative-ui-renderer-component-renderer-section-fff2322"><div className="flex items-center justify-between gap-ui-xs"><h3 className="ui-auto-generative-ui-renderer-component-renderer-h3-87e86ce-x-x-x-x">{component.title}</h3>{component.downloadAction ? <ActionButton action={component.downloadAction} onAction={onAction} context={{ ...context, componentId: component.id }}><Download className="ui-auto-generative-ui-renderer-component-renderer-download" />Open</ActionButton> : null}</div><ArtifactPreview artifact={artifact} /></section>; }
    }
}

function GeneratedForm({ component, onAction, context }: { component: Extract<GenerativeComponent, { type: "form" }>; onAction?: ActionDispatcher; context: ActionContext }) {
    const [values, setValues] = useState<Record<string, string>>({});
    return <form className="ui-auto-generative-ui-renderer-generated-form-form" onSubmit={(event) => { event.preventDefault(); if (component.submitAction && onAction) void onAction({ ...component.submitAction, payload: { ...component.submitAction.payload, values } }, { ...context, componentId: component.id }); }}><h3 className="ui-auto-generative-ui-renderer-generated-form-h3">{component.title}</h3>{component.fields.map((field) => <label key={field.id} className="block ui-auto-generative-ui-renderer-generated-form-label"><span>{field.label}{field.required ? " *" : ""}</span>{field.type === "textarea" ? <Textarea required={field.required} placeholder={field.placeholder} value={values[field.id] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))} /> : <Input required={field.required} type={field.type} placeholder={field.placeholder} value={values[field.id] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))} />}</label>)}{component.submitAction && onAction ? <Button type="submit">{component.submitAction.label}</Button> : null}</form>;
}

export function GenerativeUiRenderer({ payload, onAction, context = {}, className }: GenerativeUiRendererProps) {
    const result = validateGenerativePayload(payload);
    if (!result.success) return <div role="alert" className="ui-auto-generative-ui-renderer-div">This generated content could not be displayed safely.</div>;
    return <div className={className ?? "space-y-ui-md"}>{result.data.components.map((component) => <section key={component.id} data-renderer={GENERATIVE_COMPONENT_REGISTRY[component.type]}><ComponentRenderer component={component} onAction={onAction} context={context} /></section>)}</div>;
}
