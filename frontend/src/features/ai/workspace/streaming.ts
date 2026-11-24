import { apiFetchStream } from "../../../api/client";
import { parseAiStreamEvent, type AiStreamEvent } from "./types";

export type SseFrame = { event?: string; id?: string; retry?: number; data: string };

export function parseSseFrame(block: string): SseFrame | null {
    const data: string[] = [];
    let event: string | undefined;
    let id: string | undefined;
    let retry: number | undefined;
    for (const line of block.replace(/\r\n?/g, "\n").split("\n")) {
        if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
        else if (line.startsWith("event:")) event = line.slice(6).replace(/^ /, "");
        else if (line.startsWith("id:")) id = line.slice(3).replace(/^ /, "");
        else if (line.startsWith("retry:")) { const parsed = Number.parseInt(line.slice(6).trim(), 10); if (Number.isFinite(parsed)) retry = parsed; }
    }
    return data.length ? { event, id, retry, data: data.join("\n") } : null;
}

export async function* readSseFrames(response: Response, signal?: AbortSignal): AsyncGenerator<SseFrame> {
    if (!response.body) throw new Error("AI stream response did not include a body.");
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    const abort = () => { void reader.cancel(); };
    signal?.addEventListener("abort", abort);
    try {
        while (!signal?.aborted) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += value;
            buffer = buffer.replace(/\r\n?/g, "\n");
            const blocks = buffer.split("\n\n");
            buffer = blocks.pop() ?? "";
            for (const block of blocks) {
                const frame = parseSseFrame(block);
                if (frame) yield frame;
            }
        }
        if (buffer.trim() && !signal?.aborted) {
            const frame = parseSseFrame(buffer);
            if (frame) yield frame;
        }
    } finally {
        signal?.removeEventListener("abort", abort);
        reader.releaseLock();
    }
}

export async function* readAiStream(response: Response, signal?: AbortSignal): AsyncGenerator<AiStreamEvent> {
    for await (const frame of readSseFrames(response, signal)) {
        let payload: unknown;
        try { payload = JSON.parse(frame.data); } catch { throw new Error("AI stream returned a non-JSON event."); }
        // An SSE event name is part of the trusted transport envelope. It may
        // supply the discriminant when the JSON payload omits it.
        if (frame.event && typeof payload === "object" && payload !== null && !("type" in payload)) payload = { ...payload, type: frame.event };
        yield parseAiStreamEvent(frame.id && typeof payload === "object" && payload !== null && !("eventId" in payload) ? { ...payload, eventId: frame.id } : payload);
    }
}

export type AiStreamTransport = (path: string, options: RequestInit) => Promise<Response>;

export async function* connectAiStream(path: string, { body, signal, transport = apiFetchStream, maxReconnectAttempts = 0, reconnectDelayMs = 1000 }: { body?: BodyInit; signal?: AbortSignal; transport?: AiStreamTransport; maxReconnectAttempts?: number; reconnectDelayMs?: number } = {}): AsyncGenerator<AiStreamEvent> {
    let attempt = 0;
    let lastEventId: string | undefined;
    while (!signal?.aborted) {
        try {
            const headers = new Headers({ Accept: "text/event-stream" });
            if (lastEventId) headers.set("Last-Event-ID", lastEventId);
            const response = await transport(path, { method: body ? "POST" : "GET", body, headers, signal });
            for await (const event of readAiStream(response, signal)) {
                if (event.eventId) lastEventId = event.eventId;
                yield event;
            }
            return;
        } catch (error) {
            if (signal?.aborted || attempt >= maxReconnectAttempts) throw error;
            attempt += 1;
            await new Promise((resolve) => setTimeout(resolve, reconnectDelayMs * attempt));
        }
    }
}

