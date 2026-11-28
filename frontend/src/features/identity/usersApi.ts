import { apiFetch, apiFetchItems, type ApiRequestOptions } from "@/lib/api";

export type UserProfile = {
    id: string;
    email: string;
    full_name: string | null;
    is_verified: boolean;
    mfa_enabled: boolean;
};

export type Session = {
    id: string;
    created_at: string;
    expires_at: string;
};

export type UserDirectoryEntry = {
    id: string;
    email: string;
    full_name: string | null;
};

export async function getMe(options?: ApiRequestOptions): Promise<UserProfile> {
    return apiFetch("/users/me", options);
}

export async function updateMe(payload: { full_name?: string | null }): Promise<UserProfile> {
    return apiFetch("/users/me", { method: "PATCH", body: JSON.stringify(payload) });
}

export async function changePassword(payload: {
    current_password: string;
    new_password: string;
}): Promise<void> {
    return apiFetch("/users/me/password", { method: "PATCH", body: JSON.stringify(payload) });
}

export async function getSessions(options?: ApiRequestOptions): Promise<Session[]> {
    return apiFetch("/users/me/sessions", options);
}

export async function revokeSession(sessionId: string): Promise<void> {
    return apiFetch(`/users/me/sessions/${sessionId}`, { method: "DELETE" });
}

export async function listUserDirectory(options?: ApiRequestOptions): Promise<UserDirectoryEntry[]> {
    return apiFetchItems<UserDirectoryEntry>("/users/directory", options);
}
