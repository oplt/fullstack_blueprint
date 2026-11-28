import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RagCompareResponse } from "@/lib/generated/types";
import { RetrievalComparisonResults } from "./RetrievalComparisonResults";

vi.mock("./RagCitationList", () => ({
    CitationPreview: () => null,
}));

const result = {
    document_count: 1,
    index_revision_ids: ["revision-1"],
    baseline: {
        chunks: [{
            chunk_id: "chunk-1", document_id: "doc-1", content: "Clause excerpt",
            score: 0.03, filename: "policy.pdf", chunk_index: 0, rank: 1,
            index_revision_id: "revision-1", retrieval_sources: ["dense", "lexical"],
        }],
        diagnostics: { score_kind: "rrf", cache: "bypassed", dense_candidates: 1, lexical_candidates: 1 },
        degraded: false, no_matches: false,
    },
    candidate: {
        chunks: [{
            chunk_id: "chunk-1", document_id: "doc-1", content: "Clause excerpt",
            score: 0.87, filename: "policy.pdf", chunk_index: 0, rank: 1,
            index_revision_id: "revision-1", retrieval_sources: ["lexical"],
        }],
        diagnostics: { score_kind: "cosine", cache: "bypassed", dense_candidates: 1, lexical_candidates: 1 },
        degraded: false, no_matches: false,
    },
} as unknown as RagCompareResponse;

describe("RetrievalComparisonResults", () => {
    it("labels score scales and per-run retrieval provenance", () => {
        render(<RetrievalComparisonResults result={result} />);

        expect(screen.getByText("RRF rank score")).toBeVisible();
        expect(screen.getByText("Cosine similarity")).toBeVisible();
        const provenance = Array.from(
            screen.getByText("Clause excerpt").parentElement?.querySelectorAll("p") ?? [],
        ).find((paragraph) => paragraph.textContent?.includes("matched by"));
        expect(provenance).toHaveTextContent("Baseline matched by Vector + Keyword");
        expect(provenance).toHaveTextContent("Draft matched by Keyword");
    });
});
