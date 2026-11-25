import { describe, expect, it } from "vitest";
import { reduceAiWorkspaceEvent } from "./reducer";
import { emptyAiWorkspaceState, parseAiStreamEvent } from "./types";

describe("AI workspace event contract", () => {
    it("validates trusted events and ignores duplicate event ids", () => {
        const event = parseAiStreamEvent({ type: "text_delta", runId: "run-1", messageId: "message-1", delta: "Hello", eventId: "event-1" });
        const started = reduceAiWorkspaceEvent(emptyAiWorkspaceState, { type: "message_started", runId: "run-1", messageId: "message-1", role: "assistant", eventId: "start" });
        const next = reduceAiWorkspaceEvent(reduceAiWorkspaceEvent(started, event), event);
        expect(next.messages[0]?.content).toBe("Hello");
        expect(next.seenEventIds).toEqual(["start", "event-1"]);
    });

    it("rejects unsupported or malformed events", () => {
        expect(() => parseAiStreamEvent({ type: "tool_call_started", runId: "run-1" })).toThrow("invalid AI stream event");
        expect(() => parseAiStreamEvent({ type: "unknown", runId: "run-1" })).toThrow("invalid AI stream event");
    });
});
