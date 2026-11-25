import type { useRagWorkspace } from "../hooks/useRagWorkspace";

type Result = NonNullable<ReturnType<typeof useRagWorkspace>["askResult"]>;

export function RagDegradedNotice({ result }: { result: Result }) {
    if (!result.retrieval_degraded && !result.memory_degraded && !result.no_context_found) {
        return null;
    }
    const message = result.no_context_found
        ? "No context found. "
        : result.degradation_reason ??
          (result.retrieval_degraded
              ? "Retrieval degraded."
              : result.memory_degraded
                ? "Memory degraded."
                : "");
    return <div role="alert" className="rounded-lg border border-border p-3 text-sm">{message}</div>;
}
