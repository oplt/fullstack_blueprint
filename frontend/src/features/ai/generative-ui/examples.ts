import type { GenerativePayload } from "./schemas";

/** Storybook-ready, backend-independent examples for the generative UI renderer. */
export const generativeUiExamples: Record<string, GenerativePayload> = {
    overview: {
        version: 1,
        components: [
            { type: "text", id: "intro", text: "A validated AI-generated overview." },
            { type: "metric", id: "metric", label: "Completed", value: 42, description: "This week" },
            { type: "comparison", id: "comparison", title: "Conversion", value: "18%", comparison: 4.2 },
            { type: "checklist", id: "checklist", title: "Next steps", items: [{ id: "one", label: "Review sources", completed: true }, { id: "two", label: "Approve the draft", completed: false }] },
        ],
    },
    report: {
        version: 1,
        components: [{ type: "structured_report", id: "report", title: "Analysis report", summary: "## Summary\n\nGenerated from validated structured data.", sections: [{ id: "findings", title: "Findings", body: "The renderer uses fixed React components." }] }],
    },
};
