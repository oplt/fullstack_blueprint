import { apiFetch, apiFetchItems, type ApiRequestOptions } from "@/lib/api";

export type ApiKey = {
    id: string;
    name: string;
    key_prefix: string;
    last_used_at: string | null;
    revoked_at: string | null;
    created_at: string;
};

export type CreatedApiKey = ApiKey & {
    plaintext_key: string;
};

export type WebhookEndpoint = {
    id: string;
    target_url: string;
    description: string | null;
    is_active: boolean;
    events: string[];
    last_tested_at: string | null;
    last_response_status: number | null;
    created_at: string;
    updated_at: string;
};

export type CreatedWebhookEndpoint = WebhookEndpoint & {
    signing_secret: string;
};

export type WebhookTestResult = {
    delivered: boolean;
    status_code: number | null;
    response_preview: string | null;
    error: string | null;
};

export async function listApiKeys(options?: ApiRequestOptions): Promise<ApiKey[]> {
    return apiFetchItems<ApiKey>("/platform/api-keys", options);
}

export async function createApiKey(name: string): Promise<CreatedApiKey> {
    return apiFetch("/platform/api-keys", {
        method: "POST",
        body: JSON.stringify({ name }),
    });
}

export async function revokeApiKey(apiKeyId: string): Promise<ApiKey> {
    return apiFetch(`/platform/api-keys/${apiKeyId}`, {
        method: "DELETE",
    });
}

export async function listWebhooks(options?: ApiRequestOptions): Promise<WebhookEndpoint[]> {
    return apiFetchItems<WebhookEndpoint>("/platform/webhooks", options);
}

export async function createWebhook(payload: {
    target_url: string;
    description?: string;
    events: string[];
}): Promise<CreatedWebhookEndpoint> {
    return apiFetch("/platform/webhooks", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function updateWebhook(
    webhookId: string,
    payload: Partial<{
        target_url: string;
        description: string | null;
        events: string[];
        is_active: boolean;
    }>
): Promise<WebhookEndpoint> {
    return apiFetch(`/platform/webhooks/${webhookId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
}

export async function deleteWebhook(webhookId: string): Promise<void> {
    return apiFetch(`/platform/webhooks/${webhookId}`, {
        method: "DELETE",
    });
}

export async function testWebhook(webhookId: string): Promise<WebhookTestResult> {
    return apiFetch(`/platform/webhooks/${webhookId}/test`, {
        method: "POST",
    });
}
