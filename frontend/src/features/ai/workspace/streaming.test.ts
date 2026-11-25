import { describe, expect, it } from "vitest";
import { parseSseFrame, readAiStream } from "./streaming";

describe("AI SSE boundary", () => {
    it("parses multiline data and event metadata without executing content", () => {
        expect(parseSseFrame("event: text_delta\nid: e-1\ndata: {\"runId\":\"r\"}\n\ndata: {\"messageId\":\"m\"}")?.id).toBe("e-1");
    });

    it("reads typed JSON events from a response body", async () => {
        const body = "event: run_started\nid: e-1\ndata: {\"runId\":\"r\"}\n\n";
        const response = new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(body)); controller.close(); } }), { headers: { "Content-Type": "text/event-stream" } });
        const events = [];
        for await (const event of readAiStream(response)) events.push(event);
        expect(events).toEqual([{ type: "run_started", runId: "r", eventId: "e-1" }]);
    });
});
