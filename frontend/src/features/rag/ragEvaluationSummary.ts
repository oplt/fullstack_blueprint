/**
 * Client-side RAG evaluation summaries (Phase 14).
 * Metrics are descriptive of a single ask/retrieve response — not offline benchmarks.
 */

type RagCitationLike = {
    document_id: string;
    chunk_id: string;
    score: number;
    used_in_answer?: boolean;
};

export type RagAskLike = {
    citations: RagCitationLike[];
    retrieved_chunk_ids: string[];
    no_context_found: boolean;
    retrieval_degraded: boolean;
    memory_degraded: boolean;
    injection_chunks_filtered: number;
    citation_validation_failed?: boolean;
    citation_validation_status?: string;
};

export type RagEvaluationSummary = {
    retrievedCount: number;
    citationCount: number;
    /** Share of retrieved chunks that appear as citations (0–1). */
    citationCoverage: number | null;
    distinctDocuments: number;
    meanCitationScore: number | null;
    groundingNotes: string[];
};

function citationCoverage(retrievedIds: string[], citedIds: Set<string>): number | null {
    if (!retrievedIds.length) return null;
    return [...citedIds].filter((id) => retrievedIds.includes(id)).length / retrievedIds.length;
}

function meanScore(citations: RagCitationLike[]): number | null {
    const scores = citations.map((citation) => citation.score).filter((score) => Number.isFinite(score));
    return scores.length ? scores.reduce((total, score) => total + score, 0) / scores.length : null;
}

function baseGroundingNotes(result: RagAskLike): string[] {
    const notes = [
        result.no_context_found && "No retrieval context was available for this answer.",
        result.retrieval_degraded && "Retrieval ran in a degraded mode — treat citations cautiously.",
        result.memory_degraded && "Conversation memory was unavailable.",
        result.injection_chunks_filtered > 0
            && `Filtered ${result.injection_chunks_filtered} injection chunk(s) before answering.`,
    ].filter((note): note is string => typeof note === "string");
    return notes;
}

function citationValidationNote(result: RagAskLike, citationCount: number): string | null {
    return result.citation_validation_failed
        ? "Citation validation failed. Review the retrieved sources."
        : citationCount === 0 && !result.no_context_found && result.citation_validation_status !== "retrieval_unavailable"
            ? "Answer returned without citations — grounding is unverified."
            : null;
}

function groundingNotes(result: RagAskLike, citationCount: number, covered: number | null): string[] {
    const notes = baseGroundingNotes(result);
    const validationNote = citationValidationNote(result, citationCount);
    if (validationNote) notes.push(validationNote);
    if (covered != null && covered < 0.5 && citationCount > 0) {
        notes.push("Fewer than half of retrieved chunks were cited — review unused evidence.");
    }
    return notes;
}

export function summarizeRagAsk(result: RagAskLike): RagEvaluationSummary {
    const retrievedCount = result.retrieved_chunk_ids.length;
    const used = result.citations.filter((citation) => citation.used_in_answer !== false);
    const citationCount = used.length;
    const citedIds = new Set(used.map((c) => c.chunk_id));
    const covered = citationCoverage(result.retrieved_chunk_ids, citedIds);
    const meanCitationScore = meanScore(used);
    const distinctDocuments = new Set(used.map((c) => c.document_id)).size;

    return {
        retrievedCount,
        citationCount,
        citationCoverage: covered,
        distinctDocuments,
        meanCitationScore,
        groundingNotes: groundingNotes(result, citationCount, covered),
    };
}

export function formatCoverage(value: number | null): string {
    if (value == null || !Number.isFinite(value)) return "—";
    return `${(value * 100).toFixed(0)}%`;
}

/** Pull indexing/provenance fields from chunk metadata when present. */
export function indexingParamsFromChunkMeta(
    meta: Record<string, unknown> | null | undefined
): Array<{ key: string; label: string; value: string; helpTermId?: string }> {
    if (!meta) return [];
    const rows: Array<{ key: string; label: string; value: string; helpTermId?: string }> = [];
    const push = (key: string, label: string, helpTermId?: string) => {
        const raw = meta[key];
        if (raw == null || raw === "") return;
        rows.push({ key, label, value: String(raw), helpTermId });
    };
    push("embedding_model", "Embedding model", "embeddings");
    push("embedding_provider", "Embedding provider", "embeddings");
    push("embedding_dimensions", "Embedding dimensions", "embeddings");
    push("chunk_size", "Chunk size", "chunk_size");
    push("chunk_overlap", "Chunk overlap", "chunk_overlap");
    push("chunker_version", "Chunker version");
    push("parser_version", "Parser version");
    push("chunk_policy_version", "Chunk policy");
    return rows;
}

export function documentPipelineLabel(status: string): {
    parsing: string;
    indexing: string;
} {
    switch (status) {
        case "uploaded":
            return { parsing: "Queued", indexing: "Not started" };
        case "processing":
            return { parsing: "In progress", indexing: "In progress" };
        case "indexed":
            return { parsing: "Complete", indexing: "Indexed" };
        case "failed":
            return { parsing: "Failed / unknown", indexing: "Failed" };
        default:
            return { parsing: status, indexing: status };
    }
}
