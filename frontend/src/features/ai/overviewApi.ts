import { apiFetch, type ApiRequestOptions } from "@/lib/api";
import type { AiDocument } from "@/features/rag/api";
import type { AiEvaluationDataset } from "./evaluationsApi";
import type { AiPromptTemplate } from "./promptsApi";
import type { AiRun } from "./runsApi";

type AiProvider = {
    key: string;
    label: string;
    supports_generation: boolean;
    supports_embeddings: boolean;
};

export type AiOverview = {
    providers: AiProvider[];
    prompt_templates: AiPromptTemplate[];
    recent_runs: AiRun[];
    documents: AiDocument[];
    datasets: AiEvaluationDataset[];
};

export async function getAiOverview(options?: ApiRequestOptions): Promise<AiOverview> {
    return apiFetch("/ai/overview", options);
}
