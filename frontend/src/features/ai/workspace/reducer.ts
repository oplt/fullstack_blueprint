import type { AiStreamEvent, AiWorkspaceState } from "./types";

export function reduceAiWorkspaceEvent(state: AiWorkspaceState, event: AiStreamEvent): AiWorkspaceState {
    if (event.eventId && state.seenEventIds.includes(event.eventId)) return state;
    const seenEventIds = event.eventId ? [...state.seenEventIds, event.eventId].slice(-500) : state.seenEventIds;
    const base = { ...state, runId: event.runId, seenEventIds };
    switch (event.type) {
        case "run_started": return { ...base, status: "streaming", error: undefined };
        case "message_started": return { ...base, status: "streaming", messages: base.messages.some((message) => message.id === event.messageId) ? base.messages : [...base.messages, { id: event.messageId, role: event.role, content: "", citations: [], streaming: event.role === "assistant" }] };
        case "text_delta": return { ...base, status: "streaming", messages: base.messages.map((message) => message.id === event.messageId ? { ...message, content: message.content + event.delta, streaming: true } : message) };
        case "tool_call_started": return { ...base, status: "streaming", toolCalls: [...base.toolCalls.filter((tool) => tool.id !== event.toolCallId), { id: event.toolCallId, name: event.name, input: event.input, status: "running" }] };
        case "tool_call_completed": return { ...base, toolCalls: base.toolCalls.map((tool) => tool.id === event.toolCallId ? { ...tool, output: event.output, status: event.status } : tool) };
        case "approval_requested": return { ...base, approvals: [...base.approvals.filter((approval) => approval.id !== event.approvalId), { id: event.approvalId, title: event.title, description: event.description, actionLabel: event.actionLabel }] };
        case "approval_resolved": return { ...base, approvals: base.approvals.map((approval) => approval.id === event.approvalId ? { ...approval, approved: event.approved, reason: event.reason } : approval) };
        case "citation_added": return { ...base, messages: base.messages.map((message) => message.id === event.messageId && !message.citations.some((citation) => citation.id === event.citation.id) ? { ...message, citations: [...message.citations, event.citation] } : message) };
        case "artifact_created": return { ...base, artifacts: base.artifacts.some((artifact) => artifact.id === event.artifact.id) ? base.artifacts : [...base.artifacts, event.artifact] };
        case "usage_updated": return { ...base, usage: { ...base.usage, inputTokens: event.inputTokens ?? base.usage?.inputTokens, outputTokens: event.outputTokens ?? base.usage?.outputTokens, totalTokens: event.totalTokens ?? base.usage?.totalTokens, estimatedCostMicros: event.estimatedCostMicros ?? base.usage?.estimatedCostMicros } };
        case "run_completed": return { ...base, status: "completed", messages: base.messages.map((message) => ({ ...message, streaming: false })) };
        case "run_cancelled": return { ...base, status: "cancelled", messages: base.messages.map((message) => ({ ...message, streaming: false })) };
        case "run_failed": return { ...base, status: "failed", error: event.message, messages: base.messages.map((message) => ({ ...message, streaming: false })) };
    }
}
