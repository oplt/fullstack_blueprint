import type { GenerativeComponent } from "../schemas";

export type GenerativeComponentType = GenerativeComponent["type"];
export type GenerativeRendererKey = `render-${GenerativeComponentType}`;

/** A closed registry: model output can select a key, never a module or component. */
export const GENERATIVE_COMPONENT_REGISTRY: Readonly<Record<GenerativeComponentType, GenerativeRendererKey>> = {
    text: "render-text", markdown: "render-markdown", metric: "render-metric", data_table: "render-data_table", chart: "render-chart", comparison: "render-comparison", checklist: "render-checklist", task_list: "render-task_list", timeline: "render-timeline", citations: "render-citations", file_preview: "render-file_preview", form: "render-form", approval_request: "render-approval_request", structured_report: "render-structured_report", workflow_status: "render-workflow_status", artifact_card: "render-artifact_card",
};
