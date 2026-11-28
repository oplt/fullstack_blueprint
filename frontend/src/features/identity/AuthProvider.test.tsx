import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { logout, me } from "@/features/identity/authApi";
import { ApiError } from "@/lib/api";
import { queryKeys } from "../../lib/queryKeys";
import { AuthProvider } from "./AuthProvider";
import { useAuth } from "./authContext";

vi.mock("@/features/identity/authApi", () => ({
    logout: vi.fn(),
    me: vi.fn(),
}));

function AuthProbe() {
    const auth = useAuth();
    return <><span data-testid="auth-status">{auth.authStatus}</span><button type="button" onClick={() => void auth.logout().catch(() => undefined)}>{auth.isAuthenticated ? "signed-in" : "signed-out"}</button></>;
}

describe("AuthProvider", () => {
    afterEach(() => vi.clearAllMocks());

    it("shares and caches an anonymous session across Strict Mode remounts", async () => {
        vi.mocked(me).mockRejectedValue(new ApiError({
            status: 401,
            detail: "Authentication required",
            fieldErrors: {},
        }));
        const queryClient = new QueryClient();
        render(
            <StrictMode>
                <QueryClientProvider client={queryClient}>
                    <AuthProvider><AuthProbe /></AuthProvider>
                </QueryClientProvider>
            </StrictMode>,
        );

        await waitFor(() => expect(queryClient.getQueryData(queryKeys.auth.me)).toBeNull());
        expect(queryClient.getQueryState(queryKeys.auth.me)?.status).toBe("success");
        expect(screen.getByRole("button")).toHaveTextContent("signed-out");
        expect(me).toHaveBeenCalledOnce();
    });

    it("retains a server error from the session check", async () => {
        vi.mocked(me).mockRejectedValue(new ApiError({
            status: 503,
            detail: "Service unavailable",
            fieldErrors: {},
        }));
        const queryClient = new QueryClient();
        render(
            <QueryClientProvider client={queryClient}>
                <AuthProvider><AuthProbe /></AuthProvider>
            </QueryClientProvider>,
        );

        await waitFor(() => expect(queryClient.getQueryState(queryKeys.auth.me)?.status).toBe("error"));
        expect(queryClient.getQueryData(queryKeys.auth.me)).toBeUndefined();
        expect(me).toHaveBeenCalledOnce();
        expect(screen.getByTestId("auth-status")).toHaveTextContent("unavailable");
    });

    it.each(["succeeds", "fails"])("clears identity-scoped queries when logout %s", async outcome => {
        vi.mocked(me).mockResolvedValue({ id: "user-1", email: "user@example.com", full_name: "User", is_verified: true });
        if (outcome === "fails") vi.mocked(logout).mockRejectedValue(new Error("network unavailable"));
        else vi.mocked(logout).mockResolvedValue(undefined);
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        queryClient.setQueryData(["projects", "private"], { secret: true });

        render(
            <QueryClientProvider client={queryClient}>
                <AuthProvider><AuthProbe /></AuthProvider>
            </QueryClientProvider>,
        );

        await waitFor(() => expect(screen.getByRole("button")).toHaveTextContent("signed-in"));
        fireEvent.click(screen.getByRole("button"));
        await waitFor(() => expect(screen.getByRole("button")).toHaveTextContent("signed-out"));
        expect(queryClient.getQueryData(["projects", "private"])).toBeUndefined();
        expect(queryClient.getQueryData(queryKeys.auth.me)).toBeNull();
        await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
        expect(me).toHaveBeenCalledOnce();
    });
});
