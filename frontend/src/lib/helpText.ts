/**
 * Central help-text registry for AI and retrieval terminology.
 * Short `definition` → tooltip. Optional `detail` → popover "Learn more".
 * Never put required workflow steps only in these strings.
 */

export type HelpTermId =
    | "precision"
    | "recall"
    | "f1"
    | "macro_f1"
    | "micro_f1"
    | "confidence"
    | "chunk_size"
    | "chunk_overlap"
    | "embeddings"
    | "similarity_threshold"
    | "top_k_retrieval"
    | "reranking"
    | "temperature"
    | "model_family"
    | "citation_coverage"
    | "grounding"
    | "parsing_state"
    | "indexing_state"
    | "agent_tools"
    | "agent_trace";

export type HelpTerm = {
    id: HelpTermId;
    /** Short display title in popovers. */
    title: string;
    /** One–two sentence definition for tooltips. */
    definition: string;
    /** Longer explanation for popover / help drawer. */
    detail?: string;
};

export const HELP_TERMS: Record<HelpTermId, HelpTerm> = {
    precision: {
        id: "precision",
        title: "Precision",
        definition:
            "Of items predicted as a class, the share that truly belong to that class.",
        detail:
            "High precision means few false positives. Useful when false alarms are costly. Report per-class and aggregate (macro/micro) precision for multi-class tasks.",
    },
    recall: {
        id: "recall",
        title: "Recall",
        definition:
            "Of items that truly belong to a class, the share the model correctly finds.",
        detail:
            "High recall means few false negatives. Useful when missing positives is costly. Trade off against precision; F1 summarizes the balance.",
    },
    f1: {
        id: "f1",
        title: "F1",
        definition:
            "Harmonic mean of precision and recall for a single class or binary decision.",
        detail:
            "F1 penalizes extremes: strong precision with weak recall (or vice versa) lowers the score. Prefer macro/micro F1 when comparing multi-class models.",
    },
    macro_f1: {
        id: "macro_f1",
        title: "Macro F1",
        definition:
            "Unweighted average of per-class F1 scores—each class counts equally.",
        detail:
            "Macro F1 highlights performance on rare classes. Prefer it when class balance matters scientifically, not just overall accuracy.",
    },
    micro_f1: {
        id: "micro_f1",
        title: "Micro F1",
        definition:
            "F1 computed from pooled true/false positives and negatives across classes.",
        detail:
            "Micro F1 weights classes by support and often tracks overall accuracy in single-label multi-class settings. Dominant classes influence the score more.",
    },
    confidence: {
        id: "confidence",
        title: "Confidence",
        definition:
            "Model-estimated probability or score that a prediction is correct—not a guarantee.",
        detail:
            "Confidence is useful for review and triage but can be poorly calibrated. Prefer reliability diagrams or temperature scaling when decisions depend on probabilities.",
    },
    chunk_size: {
        id: "chunk_size",
        title: "Chunk size",
        definition:
            "Target length of each retrieved text segment during RAG ingestion (often tokens or characters).",
        detail:
            "Larger chunks keep more local context but dilute relevance; smaller chunks retrieve more precisely but may lose surrounding meaning. Pair with overlap and evaluate retrieval quality.",
    },
    chunk_overlap: {
        id: "chunk_overlap",
        title: "Chunk overlap",
        definition:
            "Shared text between consecutive chunks so sentences are not split without context.",
        detail:
            "Modest overlap reduces boundary artifacts. Excessive overlap duplicates content in the index and can bias retrieval toward repeated passages.",
    },
    embeddings: {
        id: "embeddings",
        title: "Embeddings",
        definition:
            "Dense vector representations of text used for semantic similarity and retrieval.",
        detail:
            "Embedding identity (provider, model, revision, dimension) belongs in provenance. Changing the embedding model invalidates stored vectors and comparisons.",
    },
    similarity_threshold: {
        id: "similarity_threshold",
        title: "Similarity threshold",
        definition:
            "Minimum similarity score required to keep a retrieved or matched item.",
        detail:
            "Raising the threshold increases precision of matches but may drop useful near-neighbors. Thresholds are scale-dependent on the similarity metric (cosine, etc.).",
    },
    top_k_retrieval: {
        id: "top_k_retrieval",
        title: "Top-k retrieval",
        definition:
            "Number of highest-scoring passages returned before optional reranking or context packing.",
        detail:
            "Larger k improves recall into the candidate set but increases noise and context cost. Evaluate answer quality and citation validity when changing k.",
    },
    reranking: {
        id: "reranking",
        title: "Reranking",
        definition:
            "Second-stage scoring that reorders an initial retrieval list for better relevance.",
        detail:
            "Rerankers are slower but can improve precision@k. Document when answers used hybrid retrieval + rerank versus dense-only retrieval.",
    },
    temperature: {
        id: "temperature",
        title: "Temperature",
        definition:
            "Sampling randomness for generative models—higher values yield more varied text.",
        detail:
            "For document questions and generation, lower temperature usually improves consistency. Temperature does not fix weak retrieval; it only changes generation style.",
    },
    model_family: {
        id: "model_family",
        title: "Model family",
        definition:
            "The group of language models that share an architecture or provider naming convention.",
        detail:
            "Use the specific model and version when comparing runs or reproducing results.",
    },
    citation_coverage: {
        id: "citation_coverage",
        title: "Citation coverage",
        definition:
            "Share of retrieved chunks that appear as citations in the grounded answer.",
        detail:
            "High coverage means the answer leans on the retrieved evidence set. Low coverage can mean unused evidence, over-generation, or sparse citation formatting — inspect snippets before trusting claims.",
    },
    grounding: {
        id: "grounding",
        title: "Grounding",
        definition:
            "Whether generated claims are supported by retrieved passages (citations) rather than model prior knowledge alone.",
        detail:
            "Grounding is approximate: citations show evidence the system associated with the answer, not a formal proof. Prefer answers with non-degraded retrieval and inspect citation snippets.",
    },
    parsing_state: {
        id: "parsing_state",
        title: "Parsing state",
        definition:
            "Whether the uploaded file has been decoded into text (PDF/DOCX/etc.) ready for chunking.",
        detail:
            "Parsing failures (corrupt PDFs, scanned pages without OCR) block indexing. Re-upload or re-index after fixing the source file.",
    },
    indexing_state: {
        id: "indexing_state",
        title: "Indexing state",
        definition:
            "Whether document chunks have been embedded and written to the vector index for retrieval.",
        detail:
            "Only indexed documents participate in semantic retrieval. Changing embedding models or chunk policy requires re-indexing for consistency.",
    },
    agent_tools: {
        id: "agent_tools",
        title: "Agent tools",
        definition:
            "Capabilities the agent may invoke during a run (e.g. retrieve evidence, generate text, link memory).",
        detail:
            "Tools are not free-form chat. Each tool call should appear as a structured trace step with inputs, results, and errors when available.",
    },
    agent_trace: {
        id: "agent_trace",
        title: "Agent trace",
        definition:
            "Ordered record of plan, tool calls, results, and errors for one agent run.",
        detail:
            "Prefer structured steps over raw logs. Separate the final Output artifact from Trace so users can inspect the run without drowning in text.",
    },
};

/** Resolve a term; returns null for unknown ids (callers should guard). */
export function getHelpTerm(id: HelpTermId | string): HelpTerm | null {
    return (HELP_TERMS as Record<string, HelpTerm>)[id] ?? null;
}

/** Map common metric / parameter key names onto help term ids. */
export function helpTermIdForKey(key: string): HelpTermId | null {
    const normalized = key.trim().toLowerCase().replace(/\s+/g, "_");
    const aliases: Record<string, HelpTermId> = {
        precision: "precision",
        recall: "recall",
        f1: "f1",
        f1_macro: "macro_f1",
        macro_f1: "macro_f1",
        f1_micro: "micro_f1",
        micro_f1: "micro_f1",
        confidence: "confidence",
        temperature: "temperature",
        top_k: "top_k_retrieval",
        chunk_size: "chunk_size",
        chunk_overlap: "chunk_overlap",
        embeddings: "embeddings",
        embedding: "embeddings",
        similarity_threshold: "similarity_threshold",
        rerank: "reranking",
        reranking: "reranking",
        model_family: "model_family",
        algorithm: "model_family",
        citation_coverage: "citation_coverage",
        grounding: "grounding",
        parsing_state: "parsing_state",
        indexing_state: "indexing_state",
        agent_tools: "agent_tools",
        tools: "agent_tools",
        agent_trace: "agent_trace",
        trace: "agent_trace",
    };
    return aliases[normalized] ?? null;
}
