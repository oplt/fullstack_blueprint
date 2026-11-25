import { describe, expect, it, vi } from "vitest";
import { connectAiStream, parseSseFrame, readAiStream } from "./streaming";

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

function bytesResponse(text: string) {
    return new Response(new ReadableStream({
        start(controller) {
            for (const byte of new TextEncoder().encode(text)) controller.enqueue(Uint8Array.of(byte));
            controller.close();
        },
    }));
}

it("frames split CRLF, UTF-8, repeated ids, comments and multiline JSON and discards unfinished EOF", async () => {
    const event = ':keepalive\r\nevent: run_started\r\nid: x\r\ndata: {\r\ndata: "runId":"é"}\r\n\r\n';
    const events = [];
    for await (const item of readAiStream(bytesResponse(event + event + "data: invalid\r"))) events.push(item);
    expect(events).toEqual(Array(2).fill({ type: "run_started", runId: "é", eventId: "x" }));
    expect(parseSseFrame("data\nid: good\nid: bad\0\nretry: 30\nretry: 99ms")).toMatchObject({ data: "", id: "good", retry: 30 });
});

it("cancels the underlying stream when a consumer stops", async () => {
    const cancel = vi.fn();
    const response = new Response(new ReadableStream({
        start(controller) { controller.enqueue(new TextEncoder().encode('event: run_started\rdata: {"runId":"r"}\r\r')); },
        cancel,
    }));
    const iterator = readAiStream(response);
    await iterator.next();
    await iterator.return(undefined);
    expect(cancel).toHaveBeenCalledOnce();
});

it("aborts a pending read and rejects oversized events", async () => {
    const controller = new AbortController();
    const pending = readAiStream(new Response(new ReadableStream()), controller.signal).next();
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    await expect(readAiStream(new Response("x".repeat(1024 * 1024))).next()).rejects.toThrow("size limit");
});

it("never reconnects a POST and aborts a GET reconnect delay", async () => {
    const transport = vi.fn().mockRejectedValue(new Error("offline"));
    await expect(connectAiStream("/stream", { body: "", transport, maxReconnectAttempts: 1 }).next()).rejects.toThrow("offline");
    expect(transport).toHaveBeenCalledOnce();
    const controller = new AbortController();
    const pending = connectAiStream("/stream", { transport, signal: controller.signal, maxReconnectAttempts: 1 }).next();
    await Promise.resolve();
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(transport).toHaveBeenCalledTimes(2);
});

it("carries an id-only cursor without assigning a duplicate domain event id, and permits id resets", async () => {
    const event = 'event: run_started\ndata: {"runId":"r"}\n\n';
    expect(parseSseFrame("id: first\n\n" + event)?.id).toBe("first");
    const events = [];
    for await (const item of readAiStream(bytesResponse("id: first\n\n" + event + "id:\n" + event))) {
        events.push(item);
    }
    expect(events).toEqual(Array(2).fill({ type: "run_started", runId: "r" }));
});
