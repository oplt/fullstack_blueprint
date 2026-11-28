import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDeleteDocument } from "./RagDocumentsPanel";

describe("ConfirmDeleteDocument", () => {
    it("requires confirmation and lets the user cancel without deleting", async () => {
        const user = userEvent.setup();
        const onConfirm = vi.fn();
        render(<ConfirmDeleteDocument disabled={false} onConfirm={onConfirm} />);

        await user.click(screen.getByRole("button", { name: "Delete" }));
        expect(screen.getByRole("alertdialog", { name: "Delete this RAG document?" })).toBeVisible();
        expect(screen.getByText("This action cannot be undone.")).toBeVisible();

        await user.click(screen.getByRole("button", { name: "Cancel" }));
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it("confirms deletion only after the destructive action is selected", async () => {
        const user = userEvent.setup();
        const onConfirm = vi.fn();
        render(<ConfirmDeleteDocument disabled={false} onConfirm={onConfirm} />);

        await user.click(screen.getByRole("button", { name: "Delete" }));
        await user.click(screen.getByRole("button", { name: "Delete document" }));

        expect(onConfirm).toHaveBeenCalledOnce();
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
});
