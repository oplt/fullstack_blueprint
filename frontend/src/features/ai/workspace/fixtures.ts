import type { AiStreamEvent } from "./types";

/** Development-only event fixture. It is never used by production routes. */
export const unavailableBackendFixture: AiStreamEvent[] = [
    { type: "run_started", runId: "fixture-run", eventId: "1" },
    { type: "message_started", runId: "fixture-run", messageId: "fixture-message", role: "assistant", eventId: "2" },
    { type: "text_delta", runId: "fixture-run", messageId: "fixture-message", delta: "This is an isolated development fixture.", eventId: "3" },
    { type: "run_completed", runId: "fixture-run", eventId: "4" },
];

export async function* fixtureConnector(signal: AbortSignal): AsyncGenerator<AiStreamEvent> {
    for (const event of unavailableBackendFixture) {
        if (signal.aborted) return;
        await new Promise((resolve) => setTimeout(resolve, 1));
        yield event;
    }
}

