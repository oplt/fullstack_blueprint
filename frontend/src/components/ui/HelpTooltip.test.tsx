import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, createTheme } from "@/components/ui/muiCompat";
import { HelpFieldLabel, HelpTooltip } from "./HelpTooltip";
import { HELP_TERMS, getHelpTerm, helpTermIdForKey } from "../../config/helpText";

function wrap(ui: React.ReactElement) {
    return render(<ThemeProvider theme={createTheme()}>{ui}</ThemeProvider>);
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
        wrap(
            <HelpTooltip termId="precision" variant="label">
                Precision
            </HelpTooltip>
        );
        expect(screen.getByText("Precision")).toBeInTheDocument();
        await user.hover(screen.getByRole("button", { name: /About Precision/i }));
        expect(await screen.findByRole("tooltip")).toHaveTextContent(/true positives|predicted/i);
    });

    it("opens a popover when detail exists", async () => {
        const user = userEvent.setup();
        wrap(<HelpFieldLabel termId="chunk_overlap">Chunk overlap</HelpFieldLabel>);
        await user.click(screen.getByRole("button", { name: /About Chunk overlap/i }));
        expect(await screen.findByText(/overlap too high|duplicate|overlapping/i)).toBeVisible();
    });
});
