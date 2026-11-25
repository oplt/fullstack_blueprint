import { z } from "zod";

const aiCitationSchema = z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    url: z.string().optional(),
    snippet: z.string().optional(),
    sourceType: z.string().optional(),
});

const aiArtifactSchema = z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    contentType: z.enum(["text", "markdown", "json", "image"]).default("text"),
    content: z.string().optional(),
    url: z.string().optional(),
});

const eventBase = z.object({ eventId: z.string().min(1).optional(), runId: z.string().min(1) });

const aiStreamEventSchema = z.discriminatedUnion("type", [
    eventBase.extend({ type: z.literal("run_started") }),
    eventBase.extend({ type: z.literal("message_started"), messageId: z.string().min(1), role: z.enum(["user", "assistant", "system"]) }),
    eventBase.extend({ type: z.literal("text_delta"), messageId: z.string().min(1), delta: z.string() }),
    eventBase.extend({ type: z.literal("tool_call_started"), toolCallId: z.string().min(1), name: z.string().min(1), input: z.unknown().optional() }),
    eventBase.extend({ type: z.literal("tool_call_completed"), toolCallId: z.string().min(1), output: z.unknown().optional(), status: z.enum(["completed", "failed"]).default("completed") }),
    eventBase.extend({ type: z.literal("approval_requested"), approvalId: z.string().min(1), title: z.string().min(1), description: z.string().optional(), actionLabel: z.string().optional() }),
    eventBase.extend({ type: z.literal("approval_resolved"), approvalId: z.string().min(1), approved: z.boolean(), reason: z.string().optional() }),
    eventBase.extend({ type: z.literal("citation_added"), messageId: z.string().min(1), citation: aiCitationSchema }),
    eventBase.extend({ type: z.literal("artifact_created"), artifact: aiArtifactSchema }),
    eventBase.extend({ type: z.literal("usage_updated"), inputTokens: z.number().int().nonnegative().optional(), outputTokens: z.number().int().nonnegative().optional(), totalTokens: z.number().int().nonnegative().optional(), estimatedCostMicros: z.number().int().nonnegative().optional() }),
    eventBase.extend({ type: z.literal("run_completed"), messageId: z.string().optional() }),
    eventBase.extend({ type: z.literal("run_cancelled"), reason: z.string().optional() }),
    eventBase.extend({ type: z.literal("run_failed"), message: z.string().min(1), code: z.string().optional() }),
]);

export type AiStreamEvent = z.infer<typeof aiStreamEventSchema>;
export type AiCitation = z.infer<typeof aiCitationSchema>;
export type AiArtifact = z.infer<typeof aiArtifactSchema>;

export type AiMessage = { id: string; role: "user" | "assistant" | "system"; content: string; citations: AiCitation[]; streaming?: boolean };
export type AiToolCall = { id: string; name: string; input?: unknown; output?: unknown; status: "running" | "completed" | "failed" };
type AiApproval = { id: string; title: string; description?: string; actionLabel?: string; approved?: boolean; reason?: string };
export type AiUsage = { inputTokens?: number; outputTokens?: number; totalTokens?: number; estimatedCostMicros?: number };
type AiStreamStatus = "idle" | "connecting" | "streaming" | "completed" | "cancelled" | "failed";
export type AiWorkspaceState = { runId?: string; status: AiStreamStatus; messages: AiMessage[]; toolCalls: AiToolCall[]; approvals: AiApproval[]; artifacts: AiArtifact[]; usage?: AiUsage; error?: string; seenEventIds: string[] };

export const emptyAiWorkspaceState: AiWorkspaceState = { status: "idle", messages: [], toolCalls: [], approvals: [], artifacts: [], seenEventIds: [] };

export function parseAiStreamEvent(input: unknown): AiStreamEvent {
    const result = aiStreamEventSchema.safeParse(input);
    if (!result.success) throw new Error("Unsupported or invalid AI stream event.");
    return result.data;
}

