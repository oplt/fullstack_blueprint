import { apiFetch, apiFetchItems, type ApiRequestOptions } from "@/lib/api";

export type AiPromptTemplate = {
    id: string;
    key: string;
    name: string;
    description: string | null;
    is_active: boolean;
    active_version_id: string | null;
    created_at: string;
    updated_at: string;
};

export type AiVariableDefinition = {
    name: string;
    description: string | null;
    required: boolean;
};

export type AiPromptVersion = {
    id: string;
    prompt_template_id: string;
    version_number: number;
    provider_key: string;
    model_name: string;
    system_prompt: string;
    user_prompt_template: string;
    variable_definitions: AiVariableDefinition[];
    response_format: "text" | "json";
    temperature: number;
    rollout_percentage: number;
    is_published: boolean;
    input_cost_per_million: number;
    output_cost_per_million: number;
    created_by_user_id: string | null;
    created_at: string;
};

export async function listPromptVersions(templateId: string, options?: ApiRequestOptions): Promise<AiPromptVersion[]> {
    return apiFetchItems<AiPromptVersion>(`/ai/prompts/${templateId}/versions`, options);
}

export async function createPromptTemplate(payload: {
    key: string;
    name: string;
    description?: string;
}): Promise<AiPromptTemplate> {
    return apiFetch("/ai/prompts", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function updatePromptTemplate(
    templateId: string,
    payload: Partial<{
        name: string;
        description: string | null;
        is_active: boolean;
        active_version_id: string | null;
    }>
): Promise<AiPromptTemplate> {
    return apiFetch(`/ai/prompts/${templateId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
}

export async function createPromptVersion(
    templateId: string,
    payload: {
        provider_key: string;
        model_name: string;
        system_prompt: string;
        user_prompt_template: string;
        variable_definitions: AiVariableDefinition[];
        response_format: "text" | "json";
        temperature: number;
        rollout_percentage: number;
        is_published: boolean;
        input_cost_per_million: number;
        output_cost_per_million: number;
    }
): Promise<AiPromptVersion> {
    return apiFetch(`/ai/prompts/${templateId}/versions`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function updatePromptVersion(
    templateId: string,
    versionId: string,
    payload: Partial<{
        is_published: boolean;
        rollout_percentage: number;
    }>
): Promise<AiPromptVersion> {
    return apiFetch(`/ai/prompts/${templateId}/versions/${versionId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
}
