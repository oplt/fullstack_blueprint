import { apiFetch, apiFetchItems, type ApiRequestOptions } from "../client";

export type AiReviewItem = {
    id: string;
    run_id: string;
    requested_by_user_id: string;
    assigned_to_user_id: string | null;
    reviewed_by_user_id: string | null;
    status: string;
    reviewer_notes: string | null;
    corrected_output: string | null;
    created_at: string;
    updated_at: string;
};

export async function listAiReviews(options?: ApiRequestOptions): Promise<AiReviewItem[]> {
    return apiFetchItems<AiReviewItem>("/ai/reviews", options);
}

export async function createAiReview(
    runId: string,
    payload: { assigned_to_user_id?: string | null } = {}
): Promise<AiReviewItem> {
    return apiFetch(`/ai/runs/${runId}/reviews`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function decideAiReview(
    reviewId: string,
    payload: {
        status: "approved" | "rejected" | "changes_requested";
        reviewer_notes?: string;
        corrected_output?: string;
    }
): Promise<AiReviewItem> {
    return apiFetch(`/ai/reviews/${reviewId}/decision`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}
