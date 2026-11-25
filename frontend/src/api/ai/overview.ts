import { apiFetch, type ApiRequestOptions } from "../client";
import type { AiDocument } from "./documents";
import type { AiEvaluationDataset } from "./evaluations";
import type { AiPromptTemplate } from "./prompts";
import type { AiRun } from "./runs";

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
