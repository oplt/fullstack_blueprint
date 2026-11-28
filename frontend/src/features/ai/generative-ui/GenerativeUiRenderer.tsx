import { Fragment, useState, type ReactNode } from "react";
import { CheckCircle2, Circle, Download, Hash, Workflow } from "lucide-react";
import { ActivityTimeline } from "@/components/ui/ActivityTimeline";
import { ComparisonCard } from "@/components/ui/ComparisonCard";
import { LazyChart } from "@/components/ui/LazyChart";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ReadOnlyTable } from "@/components/ui/ReadOnlyTable";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArtifactPreview, HumanApprovalRequest, SourceCitations } from "../workspace/components";
import type { AiArtifact, AiCitation } from "../workspace/types";
import type { ActionContext, ActionDispatcher } from "./actionDispatcher";
import { GENERATIVE_COMPONENT_REGISTRY } from "./registry";
import type { GenerativeAction, GenerativeComponent } from "./schemas";
import { validateGenerativePayload } from "./validation";

export type GenerativeUiRendererProps = { payload: unknown; onAction?: ActionDispatcher; context?: ActionContext; className?: string };
type RendererProps = { component: GenerativeComponent; onAction?: ActionDispatcher; context: ActionContext };
function safeUrl(value?: string): string | undefined {
    if (!value) return undefined;
    try { const url = new URL(value, window.location.origin); return ["http:", "https:"].includes(url.protocol) ? url.href : undefined; } catch { return undefined; }
}
function ActionButton({ action, onAction, context, children }: { action?: GenerativeAction; onAction?: ActionDispatcher; context: ActionContext; children: ReactNode }) {
    if (!action || !onAction) return null;
    return <Button type="button" onClick={() => { void onAction(action, context); }}>{children}</Button>;
}
function ChildComponents({ children, render }: { children?: unknown[]; render: (component: GenerativeComponent) => ReactNode }) {
    return <>{children?.map((child) => { const result = validateGenerativePayload({ version: 1, components: [child] }); return result.success ? <Fragment key={result.data.components[0].id}>{render(result.data.components[0])}</Fragment> : null; })}</>;
}
function renderValue(value: unknown): string { return value == null ? "" : typeof value === "string" || typeof value === "number" ? String(value) : "[structured value]"; }
function GeneratedForm({ component, onAction, context }: { component: Extract<GenerativeComponent, { type: "form" }>; onAction?: ActionDispatcher; context: ActionContext }) {
    const [values, setValues] = useState<Record<string, string>>({});
    return <Card size="sm"><CardContent><form className="ui-generated-form" onSubmit={(event) => { event.preventDefault(); if (component.submitAction && onAction) void onAction({ ...component.submitAction, payload: { ...component.submitAction.payload, values } }, { ...context, componentId: component.id }); }}>
        <h3 className="text-display-sm">{component.title}</h3>
        {component.fields.map((field) => <label key={field.id} className="ui-generated-field"><span>{field.label}{field.required ? " *" : ""}</span>{field.type === "textarea" ? <Textarea required={field.required} placeholder={field.placeholder} value={values[field.id] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))} /> : <Input required={field.required} type={field.type} placeholder={field.placeholder} value={values[field.id] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))} />}</label>)}
        {component.submitAction && onAction ? <Button type="submit">{component.submitAction.label}</Button> : null}
    </form></CardContent></Card>;
}
function GeneratedDataTable({ component }: { component: Extract<GenerativeComponent, { type: "data_table" }> }) {
    const title = component.title ?? "Data table";
    return <section aria-label={title} className="ui-generated-group">{component.title ? <h3 className="text-display-sm">{component.title}</h3> : null}<ReadOnlyTable ariaLabel={title} columns={component.columns} rows={component.rows} renderCell={(row, column) => renderValue(row[column.key])} /></section>;
}
function renderText({ component, onAction, context }: RendererProps): ReactNode {
    const children = (component as GenerativeComponent & { children?: unknown[] }).children;
    const descendants = <ChildComponents children={children} render={(child) => <ComponentRenderer key={child.id} component={child} onAction={onAction} context={context} />} />;
    switch (component.type) {
        case "text": return <div className="ui-generated-group"><p>{component.text}</p>{descendants}</div>;
        case "markdown": return <div className="ui-generated-group"><MarkdownRenderer content={component.markdown} />{descendants}</div>;
        case "metric": return <section className="ui-generated-group"><StatCard label={component.label} value={component.value} description={component.description} icon={<Hash aria-hidden="true" />} color={component.color} />{descendants}</section>;
        case "data_table": return <GeneratedDataTable component={component} />;
        case "chart": return <LazyChart chartType={component.chartType} title={component.title} description={component.description} data={component.data} xKey={component.xKey} series={component.series} />;
        case "comparison": return <ComparisonCard title={component.title} value={component.value} comparison={component.comparison} description={component.description} />;
        case "timeline": return <ActivityTimeline items={component.items} />;
        default: return undefined;
    }
}
function renderList({ component, onAction, context }: RendererProps): ReactNode {
    switch (component.type) {
        case "checklist": return <section aria-label={component.title ?? "Checklist"} className="ui-generated-group"><h3 className="text-display-sm">{component.title}</h3><ul className="ui-generated-checklist">{component.items.map((item) => <li key={item.id} className="ui-generated-checklist-item">{item.completed ? <CheckCircle2 className="ui-generated-check-done" aria-hidden="true" /> : <Circle className="ui-generated-check-pending" aria-hidden="true" />}<span className={item.completed ? "line-through text-muted-foreground" : undefined}>{item.label}</span></li>)}</ul></section>;
        case "task_list": return <section aria-label={component.title ?? "Task list"} className="ui-generated-group"><h3 className="text-display-sm">{component.title}</h3><ul className="ui-generated-group">{component.tasks.map((task) => <li key={task.id}><Card size="sm"><CardContent><div className="ui-generated-item-heading"><span className="text-label-sm">{task.title}</span><Badge variant="outline">{task.status}</Badge></div>{task.description ? <p className="text-body-md text-muted-foreground">{task.description}</p> : null}</CardContent></Card></li>)}</ul></section>;
        case "structured_report": return <article className="ui-generated-report"><h2 className="text-display-md">{component.title}</h2>{component.summary ? <MarkdownRenderer content={component.summary} /> : null}{component.sections.map((section) => <section key={section.id} className="ui-generated-group"><h3 className="text-display-sm">{section.title}</h3>{section.body ? <MarkdownRenderer content={section.body} /> : null}<ChildComponents children={section.components} render={(child) => <ComponentRenderer key={child.id} component={child} onAction={onAction} context={context} />} /></section>)}</article>;
        case "workflow_status": return <Card as="section" size="sm" aria-live="polite"><CardContent className="ui-generated-workflow"><Workflow className="size-(--icon-size-md)" aria-hidden="true" /><div><h3 className="text-display-sm">{component.title}</h3><p className="text-body-md">{component.status}</p>{component.detail ? <p className="text-body-md text-muted-foreground">{component.detail}</p> : null}</div></CardContent></Card>;
        default: return undefined;
    }
}
function renderAction({ component, onAction, context }: RendererProps): ReactNode {
    switch (component.type) {
        case "citations": return <SourceCitations citations={component.citations as AiCitation[]} />;
        case "file_preview": {
            const url = safeUrl(component.url); const artifact: AiArtifact = { id: component.id, title: component.title, contentType: component.contentType, content: component.content, url };
            return <section className="ui-generated-group"><ArtifactPreview artifact={artifact} />{component.url && !url ? <p role="alert" className="text-body-md text-destructive-deep">Unsafe file URL was blocked.</p> : null}</section>;
        }
        case "form": return <GeneratedForm component={component} onAction={onAction} context={context} />;
        case "approval_request": return <HumanApprovalRequest title={component.title} description={component.description} actionLabel={component.actionLabel} onResolve={(approved) => { if (approved && onAction) void onAction(component.action, { ...context, componentId: component.id }); }} />;
        case "artifact_card": {
            const artifact: AiArtifact = { id: component.id, title: component.title, contentType: component.contentType, content: component.content, url: safeUrl(component.url) };
            return <Card as="section" size="sm"><CardContent className="ui-generated-group"><div className="ui-generated-item-heading"><h3 className="text-display-sm">{component.title}</h3>{component.downloadAction ? <ActionButton action={component.downloadAction} onAction={onAction} context={{ ...context, componentId: component.id }}><Download aria-hidden="true" />Open</ActionButton> : null}</div><ArtifactPreview artifact={artifact} /></CardContent></Card>;
        }
        default: return null;
    }
}
function ComponentRenderer(props: RendererProps): ReactNode {
    // Keep the validated type switch explicit; never accept model-provided CSS/HTML/JS.
    return renderText(props) ?? renderList(props) ?? renderAction(props);
}
export function GenerativeUiRenderer({ payload, onAction, context = {}, className }: GenerativeUiRendererProps) {
    const result = validateGenerativePayload(payload);
    if (!result.success) return <div role="alert" className="ui-generated-error">This generated content could not be displayed safely.</div>;
    return <div className={className ?? "ui-generated-report"}>{result.data.components.map((component) => <section key={component.id} data-renderer={GENERATIVE_COMPONENT_REGISTRY[component.type]}><ComponentRenderer component={component} onAction={onAction} context={context} /></section>)}</div>;
}
