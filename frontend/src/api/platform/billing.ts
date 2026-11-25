import { apiFetch, type ApiRequestOptions } from "../client";

export type SubscriptionPlan = {
    id: string;
    code: string;
    name: string;
    description: string | null;
    price_cents: number;
    interval: string;
    is_active: boolean;
    is_default: boolean;
    features: string[];
    created_at: string;
    updated_at: string;
};

export type UserSubscription = {
    id: string;
    status: string;
    cancel_at_period_end: boolean;
    started_at: string;
    current_period_end: string | null;
    created_at: string;
    updated_at: string;
    plan: SubscriptionPlan;
};

export async function listSubscriptionPlans(options?: ApiRequestOptions): Promise<SubscriptionPlan[]> {
    return apiFetch("/platform/billing/plans", options);
}

export async function getMySubscription(options?: ApiRequestOptions): Promise<UserSubscription | null> {
    return apiFetch("/platform/billing/subscription", options);
}

export async function selectMyPlan(plan_code: string): Promise<UserSubscription> {
    return apiFetch("/platform/billing/subscription", {
        method: "PUT",
        body: JSON.stringify({ plan_code }),
    });
}

export async function listAdminPlans(options?: ApiRequestOptions): Promise<SubscriptionPlan[]> {
    return apiFetch("/platform/admin/plans", options);
}

export async function createAdminPlan(payload: {
    code: string;
    name: string;
    description?: string;
    price_cents: number;
    interval: string;
    is_default?: boolean;
    features: string[];
}): Promise<SubscriptionPlan> {
    return apiFetch("/platform/admin/plans", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function updateAdminPlan(
    planId: string,
    payload: Partial<{
        name: string;
        description: string | null;
        price_cents: number;
        interval: string;
        is_active: boolean;
        is_default: boolean;
        features: string[];
    }>
): Promise<SubscriptionPlan> {
    return apiFetch(`/platform/admin/plans/${planId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
}
