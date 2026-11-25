import { apiFetch, apiFetchItems, type ApiRequestOptions } from "../client";

export type AiEvaluationDataset = {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
};

export type AiEvaluationCase = {
    id: string;
    dataset_id: string;
    input_variables: Record<string, unknown>;
    retrieval_query: string | null;
    document_ids: string[];
    expected_chunk_ids: string[];
    expected_output_text: string | null;
    expected_output_json: Record<string, unknown> | null;
    notes: string | null;
    created_at: string;
};

type AiEvaluationRunItem = {
    evaluation_case_id: string;
    ai_run_id: string;
    score: number;
    passed: boolean;
    notes: string | null;
};

export type AiEvaluationRun = {
    id: string;
    dataset_id: string;
    prompt_version_id: string;
    status: string;
    total_cases: number;
    passed_cases: number;
    average_score: number;
    created_at: string;
    completed_at: string | null;
    items: AiEvaluationRunItem[];
};

export async function listAiDatasets(options?: ApiRequestOptions): Promise<AiEvaluationDataset[]> {
    return apiFetchItems<AiEvaluationDataset>("/ai/evaluation-datasets", options);
}

export async function createAiDataset(payload: {
    name: string;
    description?: string;
}): Promise<AiEvaluationDataset> {
    return apiFetch("/ai/evaluation-datasets", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function listAiDatasetCases(datasetId: string, options?: ApiRequestOptions): Promise<AiEvaluationCase[]> {
    return apiFetchItems<AiEvaluationCase>(`/ai/evaluation-datasets/${datasetId}/cases`, options);
}

export async function createAiDatasetCase(
    datasetId: string,
    payload: {
        input_variables: Record<string, unknown>;
        retrieval_query?: string | null;
        document_ids?: string[];
        expected_chunk_ids?: string[];
        expected_output_text?: string | null;
        expected_output_json?: Record<string, unknown> | null;
        notes?: string | null;
    }
): Promise<AiEvaluationCase> {
    return apiFetch(`/ai/evaluation-datasets/${datasetId}/cases`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function listAiEvaluationRuns(options?: ApiRequestOptions): Promise<AiEvaluationRun[]> {
    return apiFetchItems<AiEvaluationRun>("/ai/evaluation-runs", options);
}

export async function runAiEvaluation(
    datasetId: string,
    promptVersionId: string
): Promise<AiEvaluationRun> {
    return apiFetch(`/ai/evaluation-datasets/${datasetId}/run`, {
        method: "POST",
        body: JSON.stringify({ prompt_version_id: promptVersionId }),
    });
}
