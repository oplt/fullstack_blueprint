import { apiFetchStream } from "../../../api/client";
import { parseAiStreamEvent, type AiStreamEvent } from "./types";

export type SseFrame = { event?: string; id?: string; retry?: number; data: string };

const MAX_FRAME_LENGTH = 1024 * 1024;

type ParsedFrame = SseFrame & { explicitId?: string };

class SseParser {
    private line = "";
    private data: string[] = [];
    private length = 0;
    private event?: string;
    private cursor?: string;
    private explicitId?: string;
    private retry?: number;
    private skipLF = false;

    private readonly onRetry?: (delay: number) => void;

    constructor(onRetry?: (delay: number) => void) {
        this.onRetry = onRetry;
    }

    private setRetry(value: string) {
        if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) return;
        this.retry = Number(value);
        this.onRetry?.(this.retry);
    }

    private consumeLine(line: string) {
        const colon = line.indexOf(":");
        const field = colon < 0 ? line : line.slice(0, colon);
        const value = colon < 0 ? "" : line.slice(colon + 1).replace(/^ /, "");
        switch (field) {
            case "data": this.data.push(value); break;
            case "event": this.event = value; break;
            case "id":
                if (!value.includes("\0")) {
                    this.cursor = value;
                    this.explicitId = value || undefined;
                }
                break;
            case "retry": this.setRetry(value); break;
        }
    }

    private append(text: string) {
        this.length += text.length;
        if (this.length >= MAX_FRAME_LENGTH) throw new Error("AI stream event exceeds size limit.");
        this.line += text;
    }

    private endLine(): ParsedFrame | null {
        if (this.line) {
            ++this.length;
            this.consumeLine(this.line);
            this.line = "";
            return null;
        }
        const frame = this.data.length
            ? { data: this.data.join("\n"), event: this.event, id: this.cursor, explicitId: this.explicitId, retry: this.retry }
            : null;
        this.event = undefined;
        this.explicitId = undefined;
        this.data = [];
        this.length = 0;
        return frame;
    }

    *push(chunk: string): Generator<ParsedFrame> {
        if (!chunk) return;
        const text = this.skipLF && chunk.startsWith("\n") ? chunk.slice(1) : chunk;
        this.skipLF = text.endsWith("\r");
        let start = 0;
        for (const match of text.matchAll(/\r\n|[\r\n]/g)) {
            this.append(text.slice(start, match.index));
            const frame = this.endLine();
            if (frame) yield frame;
            start = match.index + match[0].length;
        }
        this.append(text.slice(start));
    }
}

export function parseSseFrame(block: string): SseFrame | null {
    const result = new SseParser().push(block + "\n\n").next();
    if (result.done) return null;
    const { event, id, retry, data } = result.value;
    return { event, id, retry, data };
}

async function* readSseFrames(response: Response, signal?: AbortSignal, onRetry?: (delay: number) => void): AsyncGenerator<ParsedFrame> {
    if (!response.body) throw new Error("AI stream response did not include a body.");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const parser = new SseParser(onRetry);
    const abort = () => { void reader.cancel(signal?.reason).catch(() => {}); };
    signal?.addEventListener("abort", abort);
    try {
        while (true) {
            signal?.throwIfAborted();
            const chunk = await reader.read();
            signal?.throwIfAborted();
            if (chunk.done) return;
            for (const frame of parser.push(decoder.decode(chunk.value, { stream: true }))) {
                yield frame;
                signal?.throwIfAborted();
            }
        }
    } finally {
        signal?.removeEventListener("abort", abort);
        await reader.cancel().catch(() => {});
        reader.releaseLock();
    }
}

export async function* readAiStream(response: Response, signal?: AbortSignal, onRetry?: (delay: number) => void): AsyncGenerator<AiStreamEvent> {
    for await (const frame of readSseFrames(response, signal, onRetry)) {
        let payload: unknown;
        try { payload = JSON.parse(frame.data); } catch { throw new Error("AI stream returned a non-JSON event."); }
        if (typeof payload === "object" && payload !== null) {
            // An inherited SSE cursor is shared by subsequent frames and cannot identify an AI event.
            payload = { type: frame.event, eventId: frame.explicitId, ...payload };
        }
        yield parseAiStreamEvent(payload);
    }
}

type AiStreamTransport = (path: string, options: RequestInit) => Promise<Response>;

type ConnectOptions = {
    body?: BodyInit;
    signal?: AbortSignal;
    transport?: AiStreamTransport;
    maxReconnectAttempts?: number;
    reconnectDelayMs?: number;
};

function waitForRetry(delay = 1000, signal?: AbortSignal) {
    signal?.throwIfAborted();
    return new Promise<void>((resolve, reject) => {
        const abort = () => {
            clearTimeout(timer);
            reject(signal?.reason);
        };
        const timer = setTimeout(() => {
            signal?.removeEventListener("abort", abort);
            resolve();
        }, Math.min(delay, 2147483647));
        signal?.addEventListener("abort", abort, { once: true });
    });
}

function mayReconnect(options: ConnectOptions, delivered: boolean, attempt: number) {
    return options.body === undefined && !delivered && attempt < (options.maxReconnectAttempts ?? 0);
}

export async function* connectAiStream(path: string, options: ConnectOptions = {}): AsyncGenerator<AiStreamEvent> {
    const { body, signal, transport = apiFetchStream, reconnectDelayMs } = options;
    const method = body === undefined ? "GET" : "POST";
    let delay = reconnectDelayMs;
    let delivered = false;
    for (let attempt = 0; ; attempt++) {
        signal?.throwIfAborted();
        try {
            const headers = new Headers({ Accept: "text/event-stream" });
            const response = await transport(path, { method, body, headers, signal });
            for await (const event of readAiStream(response, signal, ms => { delay = ms; })) {
                delivered = true;
                yield event;
            }
            return;
        } catch (error) {
            signal?.throwIfAborted();
            // The backend has no replay cursor. Retrying after delivery would repeat events.
            if (!mayReconnect(options, delivered, attempt)) throw error;
            await waitForRetry(delay, signal);
        }
    }
}
