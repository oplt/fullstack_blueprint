import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {MemoryRouter, useLocation} from "react-router-dom";
import {describe, expect, it} from "vitest";
import {CalendarDays, FolderKanban} from "lucide-react";
import {PageSearch} from "./PageSearch";

const pages = [
    {label: "Calendar", path: "/calendar", icon: CalendarDays},
    {label: "Projects", path: "/projects", icon: FolderKanban},
];

function CurrentPath() {
    const {pathname} = useLocation();
    return <output aria-label="Current page">{pathname}</output>;
}

function renderSearch() {
    return render(
        <MemoryRouter initialEntries={["/dashboard"]}>
            <PageSearch pages={pages}/>
            <CurrentPath/>
        </MemoryRouter>,
    );
}

describe("PageSearch", () => {
    it("filters results and navigates to the highlighted page with Enter", async () => {
        const user = userEvent.setup();
        renderSearch();

        const input = screen.getByRole("combobox", {
            name: "Search pages"
        });
        await user.type(input, "proj");
        expect(screen.getByRole("option", {name: /Projects/})).toBeVisible();
        expect(screen.queryByRole("option", {name: /Calendar/})).toBeNull();
        await user.keyboard("{Enter}");

        expect(screen.getByLabelText("Current page")).toHaveTextContent("/projects");
        expect(input).toHaveValue("");
    });

    it("opens from a global shortcut and clears on Escape", async () => {
        const user = userEvent.setup();
        renderSearch();

        await user.keyboard("/");
        const input = screen.getByRole("combobox", {
            name: "Search pages"
        });
        expect(input).toHaveFocus();
        await user.type(input, "calendar");
        expect(screen.getByRole("option", {name: /Calendar/})).toBeVisible();
        await user.keyboard("{Escape}");

        expect(input).toHaveValue("");
        expect(screen.queryByRole("listbox")).toBeNull();
    });
});
