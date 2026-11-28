import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { useRagWorkspace } from "./useRagWorkspace";
import { RagRetrievalPanel } from "./RagRetrievalPanel";

const mocks = vi.hoisted(() => ({ run: vi.fn(), cancel: vi.fn() }));

vi.mock("./useRetrievalComparison", () => ({
    useRetrievalComparison: () => ({
        state: { status: "idle" },
        run: mocks.run,
        cancel: mocks.cancel,
    }),
}));

vi.mock("./RetrievalComparisonResults", () => ({
    RetrievalComparisonResults: () => null,
}));

function workspace(status: string) {
    return {
        projectId: "project-1",
        selectedDocumentId: "doc-1",
        selectedDocument: { id: "doc-1", original_filename: "report.pdf", status },
        documents: [{ id: "doc-1", original_filename: "report.pdf", status }],
    } as unknown as ReturnType<typeof useRagWorkspace>;
}

describe("RagRetrievalPanel", () => {
    it("blocks comparisons when the selected document has no active index", async () => {
        const user = userEvent.setup();
        render(<RagRetrievalPanel workspace={workspace("indexing")} />);

        await user.type(screen.getByRole("textbox", { name: "Query" }), "find a clause");
        expect(screen.getByRole("button", { name: "Compare retrieval" })).toBeDisabled();
        expect(screen.getByText(/no active index yet/i)).toBeVisible();
    });

    it("explains that the cosine cutoff applies to vector retrieval", async () => {
        const user = userEvent.setup();
        render(<RagRetrievalPanel workspace={workspace("indexed")} />);

        await user.click(screen.getByText("Ranking and filters"));
        expect(screen.getByText(/exclude vector matches below this cosine score/i)).toBeVisible();
    });

    it("uses the shared accessible checkbox for document scope selection", async () => {
        const user = userEvent.setup();
        render(<RagRetrievalPanel workspace={workspace("indexed")} />);

        await user.selectOptions(screen.getByLabelText("Document scope"), "pick");
        const checkbox = screen.getByRole("checkbox", { name: "report.pdf" });

        expect(checkbox).toHaveAttribute("data-slot", "checkbox");
        await user.click(checkbox);
        expect(checkbox).toBeChecked();
    });

    it("sends scoped draft settings only to the comparison request", async () => {
        const user = userEvent.setup();
        render(<RagRetrievalPanel workspace={workspace("indexed")} />);
        await user.type(screen.getByRole("textbox", { name: "Query" }), "  find a clause  ");
        await user.click(screen.getByText("Ranking and filters"));
        await user.clear(screen.getByLabelText("Draft minimum cosine"));
        await user.type(screen.getByLabelText("Draft minimum cosine"), "0.5");
        await user.clear(screen.getByLabelText("Draft candidate pool"));
        await user.type(screen.getByLabelText("Draft candidate pool"), "100");
        await user.selectOptions(screen.getByLabelText("Draft reranker"), "heuristic");
        await user.click(screen.getByRole("button", { name: "Compare retrieval" }));

        expect(mocks.run).toHaveBeenCalledWith(expect.objectContaining({
            query: "find a clause",
            project_id: "project-1",
            document_ids: ["doc-1"],
            draft: { min_cosine: 0.5, candidate_pool: 100, reranker: "heuristic" },
        }));
    });
});
