import { apiFetch, type ApiRequestOptions } from "../client";

export type FeatureFlag = {
    id: string;
    key: string;
    name: string;
    description: string | null;
    module_key: string | null;
    is_enabled: boolean;
    rollout_percentage: number;
    updated_at: string;
};

export type EffectiveFeatureFlag = FeatureFlag & {
    effective_enabled: boolean;
};

export async function listMyFeatureFlags(options?: ApiRequestOptions): Promise<EffectiveFeatureFlag[]> {
    return apiFetch("/platform/feature-flags", options);
}

export async function listAdminFeatureFlags(options?: ApiRequestOptions): Promise<FeatureFlag[]> {
    return apiFetch("/platform/admin/feature-flags", options);
}

export async function createAdminFeatureFlag(payload: {
    key: string;
    name: string;
    description?: string;
    module_key?: string | null;
    is_enabled?: boolean;
    rollout_percentage?: number;
}): Promise<FeatureFlag> {
    return apiFetch("/platform/admin/feature-flags", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function updateAdminFeatureFlag(
    featureFlagId: string,
    payload: Partial<{
        name: string;
        description: string | null;
        module_key: string | null;
        is_enabled: boolean;
        rollout_percentage: number;
    }>
): Promise<FeatureFlag> {
    return apiFetch(`/platform/admin/feature-flags/${featureFlagId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
}
