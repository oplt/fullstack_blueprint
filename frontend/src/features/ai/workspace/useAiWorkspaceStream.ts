import { useCallback, useEffect, useRef, useState } from "react";
import { reduceAiWorkspaceEvent, resetAiWorkspaceState } from "./reducer";
import type { AiStreamEvent, AiWorkspaceState } from "./types";

export type AiWorkspaceConnector = (signal: AbortSignal) => AsyncIterable<AiStreamEvent>;

export function useAiWorkspaceStream() {
    const [state, setState] = useState<AiWorkspaceState>(resetAiWorkspaceState);
    const controllerRef = useRef<AbortController | null>(null);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    const cancel = useCallback(() => {
        controllerRef.current?.abort();
        controllerRef.current = null;
        setState((current) => ({ ...current, status: "cancelled" }));
    }, []);

    const start = useCallback(async (connect: AiWorkspaceConnector) => {
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        setConnectionError(null);
        setState({ ...resetAiWorkspaceState(), status: "connecting" });
        try {
            for await (const event of connect(controller.signal)) {
                if (!controller.signal.aborted) setState((current) => reduceAiWorkspaceEvent(current, event));
            }
        } catch (error) {
            if (!controller.signal.aborted) {
                const message = error instanceof Error ? error.message : "The AI connection failed.";
                setConnectionError(message);
                setState((current) => ({ ...current, status: "failed", error: message }));
            }
        } finally {
            if (controllerRef.current === controller) controllerRef.current = null;
        }
    }, []);

    const reset = useCallback(() => {
        controllerRef.current?.abort();
        controllerRef.current = null;
        setConnectionError(null);
        setState(resetAiWorkspaceState());
    }, []);

    useEffect(() => () => controllerRef.current?.abort(), []);
    return { state, connectionError, start, cancel, reset };
}

