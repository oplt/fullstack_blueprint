import { apiFetch, type ApiRequestOptions } from "@/lib/api";
import type {
    AuthSessionResponse,
    AuthUserResponse,
    MfaEnableResponse,
} from "@/lib/generated/types";

export type AuthUser = AuthUserResponse;
export type AuthResponse = AuthSessionResponse;
export type MfaSetup = MfaEnableResponse;

export async function signUp(payload: {
    email: string;
    password: string;
    full_name?: string;
    admin_invite_code?: string;
}) {
    return apiFetch<{ detail: string }>("/auth/sign-up", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function signIn(payload: {
    email: string;
    password: string;
    mfa_code?: string;
}): Promise<AuthResponse> {
    return apiFetch("/auth/sign-in", {
        method: "POST",
        body: JSON.stringify(payload),
    }, false);
}

export async function me(options?: ApiRequestOptions) {
    return apiFetch<AuthUser>("/auth/me", options);
}

export async function logout() {
    return apiFetch("/auth/logout", {
        method: "POST",
    });
}

export async function forgotPassword(payload: { email: string }) {
    return apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function resetPassword(payload: { token: string; new_password: string }) {
    return apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function verifyEmail(payload: { token: string }) {
    return apiFetch("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function resendVerification(payload: { email: string }) {
    return apiFetch("/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function enableMfa(): Promise<MfaSetup> {
    return apiFetch("/auth/mfa/enable", {
        method: "POST",
    });
}

export async function verifyMfa(code: string) {
    return apiFetch("/auth/mfa/verify", {
        method: "POST",
        body: JSON.stringify({ code }),
    });
}

export async function disableMfa(code: string) {
    return apiFetch("/auth/mfa/disable", {
        method: "POST",
        body: JSON.stringify({ code }),
    });
}
