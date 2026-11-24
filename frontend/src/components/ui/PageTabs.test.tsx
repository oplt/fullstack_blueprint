import { describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PageTabs } from "./PageTabs";
import { useTabQueryParam } from "../../hooks/useTabQueryParam";

const TABS = ["dataset", "train", "evaluate"] as const;

function Harness() {
    const [tab, setTab] = useTabQueryParam(TABS, "dataset");
    const location = useLocation();
    return (
        <div>
            <PageTabs
                value={tab}
                onChange={setTab}
                tabs={TABS.map((value) => ({ value, label: value }))}
            />
            <div data-testid="tab-value">{tab}</div>
            <div data-testid="search">{location.search}</div>
        </div>
    );
}

describe("PageTabs + useTabQueryParam", () => {
    it("updates the URL tab query and keeps the selection", async () => {
        const user = userEvent.setup();
        render(
            <MemoryRouter initialEntries={["/projects/p1"]}>
                <Routes>
                    <Route path="/projects/:projectId" element={<Harness />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByTestId("tab-value")).toHaveTextContent("dataset");
        await user.click(screen.getByRole("tab", { name: "train" }));
        expect(screen.getByTestId("tab-value")).toHaveTextContent("train");
        expect(screen.getByTestId("search")).toHaveTextContent("tab=train");
    });

    it("maps legacy alias query values onto current tabs", () => {
        function AliasHarness() {
            const [tab] = useTabQueryParam(
                ["dataset", "predictions"] as const,
                "dataset",
                "tab",
                { aliases: { models: "predictions" } }
            );
            const location = useLocation();
            return (
                <div>
                    <div data-testid="tab-value">{tab}</div>
                    <div data-testid="search">{location.search}</div>
                </div>
            );
        }

        render(
            <MemoryRouter initialEntries={["/projects/p1?tab=models"]}>
                <Routes>
                    <Route path="/projects/:projectId" element={<AliasHarness />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByTestId("tab-value")).toHaveTextContent("predictions");
        expect(screen.getByTestId("search")).toHaveTextContent("tab=models");
    });
});
