import { apiFetch, type ApiRequestOptions } from "../client";

type ModuleCatalogItem = {
    key: string;
    label: string;
    description: string;
    user_visible: boolean;
    enabled: boolean;
};

type ModulePack = {
    key: string;
    label: string;
    description: string;
    modules: string[];
};

export type PlatformMetadata = {
    available_features: string[];
    app_name: string;
    core_domain_singular: string;
    core_domain_plural: string;
    module_pack: string;
    enabled_modules: string[];
    module_catalog: ModuleCatalogItem[];
    available_module_packs: ModulePack[];
    mfa_enabled: boolean;
    /** Optional server-authoritative context for generated deployments. */
    feature_flags?: Record<string, boolean>;
    permissions?: string[];
    entitlements?: string[];
    backend_endpoints?: string[];
};

export type PlatformConfig = PlatformMetadata & {
    module_overrides: Record<string, boolean>;
};

export async function getPlatformMetadata(options?: ApiRequestOptions): Promise<PlatformMetadata> {
    return apiFetch("/platform/metadata", options);
}

export async function getPlatformConfig(options?: ApiRequestOptions): Promise<PlatformConfig> {
    return apiFetch("/platform/admin/config", options);
}

export async function updatePlatformConfig(payload: {
    app_name?: string;
    core_domain_singular?: string;
    core_domain_plural?: string;
    module_pack?: string;
    module_overrides?: Record<string, boolean>;
    mfa_enabled?: boolean;
}): Promise<PlatformConfig> {
    return apiFetch("/platform/admin/config", {
        method: "PUT",
        body: JSON.stringify(payload),
    });
}
