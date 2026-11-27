import { useEffect, useRef, useState } from "react";
import { compareRagRetrieval } from "@/api/rag";
import type { RagCompareRequest, RagCompareResponse } from "@/api/generated/types";
import { getQueryErrorMessage } from "@/utils/queryErrors";

type ComparisonState =
    | { status: "idle" | "running" | "cancelled" }
    | { status: "error"; message: string }
    | { status: "complete"; result: RagCompareResponse };

export function useRetrievalComparison() {
    const [state, setState] = useState<ComparisonState>({ status: "idle" });
    const active = useRef<AbortController | null>(null);

    useEffect(() => () => active.current?.abort(), []);

    async function run(payload: RagCompareRequest) {
        active.current?.abort();
        const controller = new AbortController();
        active.current = controller;
        setState({ status: "running" });
        try {
            const result = await compareRagRetrieval(payload, controller.signal);
            if (!controller.signal.aborted) setState({ status: "complete", result });
        } catch (error) {
            if (!controller.signal.aborted) {
                setState({ status: "error", message: getQueryErrorMessage(error, "Comparison failed.") });
            }
        } finally {
            if (active.current === controller) active.current = null;
        }
    }

    function cancel() {
        active.current?.abort();
        active.current = null;
        setState({ status: "cancelled" });
    }

    return { state, run, cancel };
}
