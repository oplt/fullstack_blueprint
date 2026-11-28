import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HelpFieldLabel, HelpTooltip } from "./HelpTooltip";
import { HELP_TERMS, getHelpTerm, helpTermIdForKey } from "../../lib/helpText";

function wrap(ui: React.ReactElement) {
    return render(ui);
}

describe("helpText registry", () => {
    it("covers the retained AI and retrieval terms", () => {
        const required = [
            "precision", "recall", "f1", "macro_f1", "micro_f1", "confidence",
            "chunk_size", "chunk_overlap", "embeddings", "similarity_threshold",
            "top_k_retrieval", "reranking", "temperature", "model_family",
            "citation_coverage", "grounding", "parsing_state", "indexing_state",
            "agent_tools", "agent_trace",
        ] as const;
        for (const id of required) {
            expect(getHelpTerm(id)?.definition.length).toBeGreaterThan(10);
            expect(HELP_TERMS[id].id).toBe(id);
        }
    });

    it("maps metric aliases to term ids", () => {
        expect(helpTermIdForKey("top_k")).toBe("top_k_retrieval");
        expect(helpTermIdForKey("f1_macro")).toBe("macro_f1");
        expect(helpTermIdForKey("unknown")).toBeNull();
    });
});

describe("HelpTooltip", () => {
    it("shows a short tooltip for terms without forcing a popover click", async () => {
        const user = userEvent.setup();
        wrap(<HelpTooltip title="Brief explanation" />);
        const trigger = screen.getByRole("button", { name: "About this term" });
        await user.tab();
        expect(trigger).toHaveFocus();
        expect(await screen.findByText("Brief explanation")).toBeVisible();
        expect(trigger).toHaveAccessibleDescription("Brief explanation");
        await user.keyboard("{Escape}");
        expect(screen.queryByRole("tooltip")).toBeNull();
        await user.hover(trigger);
        expect(await screen.findByText("Brief explanation")).toBeVisible();
    });

    it("opens a popover when detail exists", async () => {
        const user = userEvent.setup();
        wrap(<HelpFieldLabel termId="chunk_overlap">Chunk overlap</HelpFieldLabel>);
        await user.click(screen.getByRole("button", { name: /About Chunk overlap/i }));
        expect(await screen.findByRole("dialog", { name: "Chunk overlap" })).toBeVisible();
        expect(await screen.findByText(/overlap too high|duplicate|overlapping/i)).toBeVisible();
        await user.keyboard("{Escape}");
        expect(screen.getByRole("button", { name: /About Chunk overlap/i })).toHaveFocus();
    });
});
