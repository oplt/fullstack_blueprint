import { expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import "../../i18n/config";
import { queryKeys } from "../../config/queryKeys";
import { ColorModeContext } from "../../app/colorModeContext";
import { AppLayout } from "./AppLayout";
// jsdom does not evaluate CSS media queries. Mount the mobile control explicitly;
// real viewport behavior is validated in browser tests.
vi.mock("../../hooks/use-mobile", () => ({ useIsMobile: () => true }));
it("keeps the shell operable when storage is blocked and labels its collapsed and mobile controls", async () => {
    const user = userEvent.setup();
    const client = new QueryClient({ defaultOptions: { queries: { enabled: false } } });
    client.setQueryData(queryKeys.projects.all, []);
    const setMode = vi.fn();
    const denied = () => { throw new DOMException("Blocked", "SecurityError"); };
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(denied);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(denied);
    try {
        render(<QueryClientProvider client={client}><ColorModeContext.Provider value={{ colorMode: "system", resolvedMode: "dark", setColorMode: setMode }}><MemoryRouter initialEntries={["/dashboard"]}><AppLayout /></MemoryRouter></ColorModeContext.Provider></QueryClientProvider>);
        await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));
        expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
        const nav = screen.getByRole("navigation", { name: "Main navigation" });
        expect(within(nav).getByRole("link", { current: "page" })).toHaveAccessibleName("Dashboard");
        expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
        expect(screen.queryByRole("button", { name: "Open notification center" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Select project" })).not.toBeInTheDocument();
        expect(client.getQueryCache().find({ queryKey: queryKeys.notifications.all })).toBeUndefined();
        expect(client.getQueryCache().find({ queryKey: queryKeys.projects.all })?.state.fetchStatus).toBe("idle");
        const mode = screen.getByRole("button", { name: "Theme: Light" });
        await user.click(mode);
        expect(setMode).toHaveBeenCalledWith("light");
        await user.click(screen.getByRole("button", { name: "Open navigation menu" }));
        const sheet = await screen.findByRole("dialog", { name: "Main navigation" });
        expect(sheet).toHaveAccessibleDescription("Workspace");
        await user.click(within(sheet).getByRole("link", { name: "Dashboard" }));
        expect(screen.queryByRole("dialog")).toBeNull();
    } finally { vi.restoreAllMocks(); client.clear(); }
});
