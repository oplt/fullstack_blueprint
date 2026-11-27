import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "../config/queryKeys";
import { getNotifications } from "../api/notifications";
import { listProjects } from "../api/projects";
import DashboardPage from "./DashboardPage";

vi.mock("../api/projects", () => ({ listProjects: vi.fn() }));
vi.mock("../api/notifications", () => ({ getNotifications: vi.fn() }));
vi.mock("../hooks/usePlatformMetadata", () => ({
    usePlatformMetadata: () => ({ data: { available_features: ["projects"] } }),
}));

describe("minimal dashboard capability gates", () => {
    afterEach(() => vi.clearAllMocks());

    it("keeps core projects available and hides disabled notifications", async () => {
        vi.mocked(listProjects).mockResolvedValue([]);
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        render(
            <QueryClientProvider client={client}>
                <MemoryRouter>
                    <DashboardPage />
                </MemoryRouter>
            </QueryClientProvider>,
        );

        expect(screen.getByText("Account health")).toBeInTheDocument();
        expect(screen.queryByText("Recent activity")).not.toBeInTheDocument();
        expect(screen.getByText("Projects snapshot")).toBeInTheDocument();
        expect(listProjects).toHaveBeenCalledOnce();
        expect(getNotifications).not.toHaveBeenCalled();
        await waitFor(() => expect(client.getQueryCache().find({ queryKey: queryKeys.projects.all })?.state.fetchStatus).toBe("idle"));
        expect(client.getQueryCache().find({ queryKey: queryKeys.notifications.all })?.state.fetchStatus).toBe("idle");
        client.clear();
    });
});
