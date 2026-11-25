import { apiFetch, type ApiRequestOptions, type Paginated } from "./client";
import type { AiRun } from "./ai/runs";

const BASE = "/agent";

export type AgentRun = AiRun & {
    agent_id: string | null;
    agent_run_id: string | null;
    memory_run_id: string;
};

export type AgentRunRequest = {
    agent_id?: string;
    run_id?: string;
    project_id?: string;
    user_message?: string;
    prompt_template_key?: string;
    prompt_version_id?: string;
    variables?: Record<string, unknown>;
    retrieval_query?: string;
    document_ids?: string[];
    top_k?: number;
    review_required?: boolean;
};

/** Sync agent execution (201). Backend times out long runs; UI shows loading/error. */
export async function createAgentRun(payload: AgentRunRequest): Promise<AgentRun> {
    return apiFetch(`${BASE}/runs`, {
        method: "POST",
        body: JSON.stringify({
            agent_id: "default",
            top_k: 4,
            review_required: false,
            ...payload,
        }),
    });
}

export async function listAgentRuns(
    options: { limit?: number; offset?: number; signal?: AbortSignal } = {}
): Promise<Paginated<AgentRun>> {
    const search = new URLSearchParams();
    if (options.limit !== undefined) search.set("limit", String(options.limit));
    if (options.offset !== undefined) search.set("offset", String(options.offset));
    const query = search.size ? `?${search}` : "";
    return apiFetch(`${BASE}/runs${query}`, { signal: options.signal });
}

export async function getAgentRun(runId: string, options?: ApiRequestOptions): Promise<AgentRun> {
    return apiFetch(`${BASE}/runs/${runId}`, options);
}

export function formatAgentCostMicros(micros: number): string {
    if (!Number.isFinite(micros) || micros <= 0) return "$0.00";
    return `$${(micros / 1_000_000).toFixed(4)}`;
}
