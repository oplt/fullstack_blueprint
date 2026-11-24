import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { runStatusAriaLabel } from "../../app/a11y";
import { SkipToContentLink } from "./SkipToContentLink";
import { RunStatusChip } from "./RunStatusChip";
import { RunStatusPanel } from "./RunStatusPanel";
import { AdvancedSettings } from "./AdvancedSettings";

function wrap(ui: React.ReactElement) {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return render(
        <QueryClientProvider client={client}>
            <ThemeProvider theme={createTheme()}>{ui}</ThemeProvider>
        </QueryClientProvider>
    );
}

describe("a11y helpers", () => {
    it("labels run status with text, not color alone", () => {
        expect(runStatusAriaLabel("Completed")).toBe("Status: Completed");
        wrap(<RunStatusChip status="failed" />);
        expect(screen.getByLabelText("Status: Failed")).toBeInTheDocument();
        expect(screen.getByText("Failed")).toBeInTheDocument();
    });
});

describe("SkipToContentLink", () => {
    it("targets main content and is focusable", async () => {
        const user = userEvent.setup();
        wrap(
            <>
                <SkipToContentLink />
                <main id="main-content">Page</main>
            </>
        );
        const link = screen.getByRole("link", { name: "Skip to main content" });
        expect(link).toHaveAttribute("href", "#main-content");
        await user.tab();
        expect(link).toHaveFocus();
    });
});

describe("RunStatusPanel announcements", () => {
    it("exposes a live status region while a run is active", () => {
        wrap(<RunStatusPanel status="running" progress={42} title="Train run" />);
        const region = screen.getByRole("status");
        expect(region).toHaveAttribute("aria-live", "polite");
        expect(screen.getByLabelText(/Run progress 42 percent/i)).toBeInTheDocument();
    });
});

describe("AdvancedSettings ids", () => {
    it("uses unique accordion header/content ids", () => {
        wrap(
            <>
                <AdvancedSettings title="First">a</AdvancedSettings>
                <AdvancedSettings title="Second">b</AdvancedSettings>
            </>
        );
        const headers = screen.getAllByRole("button");
        const ids = headers.map((el) => el.getAttribute("id"));
        expect(ids[0]).toBeTruthy();
        expect(ids[1]).toBeTruthy();
        expect(ids[0]).not.toBe(ids[1]);
    });
});
