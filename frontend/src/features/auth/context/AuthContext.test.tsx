import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { logout, me } from "../../../api/auth";
import { queryKeys } from "../../../config/queryKeys";
import { AuthProvider } from "./AuthContext";
import { useAuth } from "./authContext";

vi.mock("../../../api/auth", () => ({
    logout: vi.fn(),
    me: vi.fn(),
}));

function AuthProbe() {
    const auth = useAuth();
    return <button type="button" onClick={() => void auth.logout().catch(() => undefined)}>{auth.isAuthenticated ? "signed-in" : "signed-out"}</button>;
}

describe("AuthProvider", () => {
    afterEach(() => vi.clearAllMocks());

    it("clears identity-scoped queries when logout fails", async () => {
        vi.mocked(me).mockResolvedValue({ id: "user-1", email: "user@example.com", full_name: "User", is_verified: true });
        vi.mocked(logout).mockRejectedValue(new Error("network unavailable"));
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
    });
});
