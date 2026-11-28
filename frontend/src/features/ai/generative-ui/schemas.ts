import { z } from "zod";

const id = z.string().min(1).max(120);
const label = z.string().min(1).max(240);
const actionSchema = z.object({
    actionId: id,
    label,
    kind: z.enum(["submit", "approve", "open", "retry", "custom"]),
    payload: z.record(z.string(), z.unknown()).default({}),
    requiresConfirmation: z.boolean().default(true),
});

const base = z.object({ id, children: z.array(z.unknown()).max(20).optional() });
const text = base.extend({ type: z.literal("text"), text: z.string().max(10_000) });
const markdown = base.extend({ type: z.literal("markdown"), markdown: z.string().max(20_000) });
const metric = base.extend({ type: z.literal("metric"), label, value: z.union([z.string().max(200), z.number()]), description: z.string().max(500).optional(), color: z.enum(["primary", "secondary", "success", "warning", "error", "info"]).optional() });
const dataTable = base.extend({ type: z.literal("data_table"), title: label.optional(), columns: z.array(z.object({ key: id, label })).min(1).max(30), rows: z.array(z.record(z.string(), z.unknown())).max(200) });
const chart = base.extend({ type: z.literal("chart"), chartType: z.enum(["line", "area", "bar", "donut"]), title: label, description: z.string().max(500).optional(), xKey: id, data: z.array(z.record(z.string(), z.union([z.string().max(500), z.number(), z.null()]))).max(200), series: z.array(z.object({ dataKey: id, label: label.optional(), color: z.string().max(80).optional(), stackId: z.string().max(80).optional() })).max(12) });
const comparison = base.extend({ type: z.literal("comparison"), title: label, value: z.union([z.string().max(200), z.number()]), comparison: z.number().optional(), description: z.string().max(500).optional() });
const checklist = base.extend({ type: z.literal("checklist"), title: label.optional(), items: z.array(z.object({ id, label, completed: z.boolean().default(false) })).max(100) });
const taskList = base.extend({ type: z.literal("task_list"), title: label.optional(), tasks: z.array(z.object({ id, title: label, status: z.enum(["pending", "active", "complete", "blocked"]).default("pending"), description: z.string().max(500).optional() })).max(100) });
const timeline = base.extend({ type: z.literal("timeline"), items: z.array(z.object({ id, title: label, description: z.string().max(500).optional(), timestamp: z.string().max(120).optional(), status: z.enum(["complete", "active", "pending"]).default("pending") })).max(100) });
const citations = base.extend({ type: z.literal("citations"), citations: z.array(z.object({ id, title: label, url: z.string().max(2_000).optional(), snippet: z.string().max(1_000).optional() })).max(100) });
const filePreview = base.extend({ type: z.literal("file_preview"), title: label, contentType: z.enum(["text", "markdown", "json", "image"]), content: z.string().max(100_000).optional(), url: z.string().max(2_000).optional() });
const form = base.extend({ type: z.literal("form"), title: label, fields: z.array(z.object({ id, label, type: z.enum(["text", "email", "number", "textarea"]), required: z.boolean().default(false), placeholder: z.string().max(300).optional() })).min(1).max(30), submitAction: actionSchema.optional() });
const approval = base.extend({ type: z.literal("approval_request"), title: label, description: z.string().max(2_000).optional(), actionLabel: label.optional(), action: actionSchema });
const report = base.extend({ type: z.literal("structured_report"), title: label, summary: z.string().max(10_000).optional(), sections: z.array(z.object({ id, title: label, body: z.string().max(20_000).optional(), components: z.array(z.unknown()).max(20).optional() })).max(30) });
const workflow = base.extend({ type: z.literal("workflow_status"), title: label, status: z.enum(["queued", "running", "succeeded", "failed", "cancelled"]), detail: z.string().max(1_000).optional() });
const artifact = base.extend({ type: z.literal("artifact_card"), title: label, contentType: z.enum(["text", "markdown", "json", "image"]), content: z.string().max(100_000).optional(), url: z.string().max(2_000).optional(), downloadAction: actionSchema.optional() });

export const componentSchema = z.discriminatedUnion("type", [text, markdown, metric, dataTable, chart, comparison, checklist, taskList, timeline, citations, filePreview, form, approval, report, workflow, artifact]);
export const generativePayloadSchema = z.object({ version: z.literal(1), components: z.array(z.unknown()).max(50) });
export { actionSchema };
export type GenerativeComponent = z.infer<typeof componentSchema>;
export type GenerativePayload = { version: 1; components: GenerativeComponent[] };
export type GenerativeAction = z.infer<typeof actionSchema>;
