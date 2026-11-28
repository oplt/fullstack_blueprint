import { apiFetch } from "@/lib/api";

export type AiRun = {
    id: string;
    prompt_template_id: string | null;
    prompt_version_id: string | null;
    provider_key: string;
    model_name: string;
    status: string;
    response_format: string;
    variables: Record<string, unknown>;
    retrieval_query: string | null;
    retrieved_chunk_ids: string[];
    retrieval_degraded: boolean;
    memory_degraded: boolean;
    degradation_reason: string | null;
    injection_chunks_filtered: number;
    input_messages: Array<{ role: string; content: string }>;
    output_text: string | null;
    output_json: Record<string, unknown> | null;
    latency_ms: number | null;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    estimated_cost_micros: number;
    error_message: string | null;
    review_status: string;
    created_at: string;
    completed_at: string | null;
};

export type AiFeedback = {
    id: string;
    run_id: string;
    user_id: string;
    rating: number;
    comment: string | null;
    corrected_output: string | null;
    created_at: string;
};

export async function createAiRun(payload: {
    prompt_template_key?: string;
    prompt_version_id?: string;
    variables: Record<string, unknown>;
    retrieval_query?: string;
    document_ids: string[];
    top_k: number;
    review_required: boolean;
}): Promise<AiRun> {
    return apiFetch("/ai/runs", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function createAiFeedback(
    runId: string,
    payload: { rating: -1 | 1; comment?: string; corrected_output?: string }
): Promise<AiFeedback> {
    return apiFetch(`/ai/runs/${runId}/feedback`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}
