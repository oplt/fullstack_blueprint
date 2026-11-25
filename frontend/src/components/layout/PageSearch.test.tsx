import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import "../../i18n/config";
import { PageSearch } from "./PageSearch";

function Workspace() {
    const location = useLocation();
    return <>
        <select aria-label="Select"><option>One</option></select>
        <div contentEditable suppressContentEditableWarning><span>Editor</span></div>
        <PageSearch key={location.key} pages={[
            { path: "/projects", label: "Projects", icon: Search },
            { path: "/profile", label: "Profile", icon: Search },
        ]} />
        <output>{location.pathname}</output>
    </>;
}

describe("page search", () => {
    it("ignores shortcuts while editing, composing or holding a key", () => {
        render(<MemoryRouter><Workspace /></MemoryRouter>);
        for (const target of [screen.getByText("Editor"), screen.getByRole("combobox")]) {
            expect(fireEvent.keyDown(target, { key: "/" })).toBe(true);
        }
        expect(fireEvent.keyDown(window, { key: "/", repeat: true })).toBe(true);
        expect(fireEvent.keyDown(window, { key: "/", isComposing: true })).toBe(true);
        expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("restores focus after Escape, clears search, and navigates with arrow keys", async () => {
        const user = userEvent.setup();
        render(<MemoryRouter><Workspace /></MemoryRouter>);
        const trigger = screen.getByRole("button", { name: "Search pages" });
        trigger.focus();
        await user.keyboard("/");
        const input = await screen.findByRole("textbox");
        await waitFor(() => expect(input).toHaveFocus());
        await user.type(input, "missing");
        expect(screen.getByText("No matching pages.")).toBeVisible();
        await user.keyboard("{Escape}");
        await waitFor(() => expect(trigger).toHaveFocus());
        await user.keyboard("{Control>}k{/Control}");
        const nextInput = await screen.findByRole("textbox");
        await waitFor(() => expect(nextInput).toHaveFocus());
        expect(nextInput).toHaveValue("");
        await user.keyboard("{ArrowUp}{Enter}");
        expect(screen.getByText("/profile")).toBeVisible();
        expect(screen.queryByRole("dialog")).toBeNull();
    });
});
