import { apiFetch, paginationParams, type ApiRequestOptions, type Paginated } from "@/lib/api";
import type {
    AiDocumentResponse,
    AiDocumentCreate,
    RagAskResponse,
    RagCitationResponse,
    RagCompareRequest,
    RagCompareResponse,
    RagRetrieveResponse,
    RagSourcePreviewResponse,
} from "@/lib/generated/types";

const BASE = "/rag";

export type AiDocument = AiDocumentResponse;

export type RagDocument = {
    id: string;
    user_id: string;
    project_id: string | null;
    organization_id: string | null;
    filename: string;
    original_filename: string;
    content_type: string;
    storage_path: string | null;
    status: string;
    source_type: string;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
};

export type RagIngestionJob = {
    id: string;
    document_id: string;
    user_id: string;
    project_id: string | null;
    status: string;
    error_message: string | null;
    started_at: string | null;
    finished_at: string | null;
    created_at: string;
};

export type RagDocumentUpload = {
    document: RagDocument;
    ingestion_job: RagIngestionJob;
};

export type RagChunk = {
    id: string;
    document_id: string;
    chunk_index: number;
    content: string;
    token_count: number;
    metadata: Record<string, unknown>;
};

type RagRetrievedChunk = {
    chunk_id: string;
    document_id: string;
    content: string;
    score: number;
    filename: string;
    chunk_index: number;
    page_number: number | null;
};

export type RagRetrieveResult = {
    chunks: RagRetrievedChunk[];
    degraded: boolean;
    degradation_reason: string | null;
    no_matches: boolean;
    injection_chunks_filtered: number;
} & Pick<RagRetrieveResponse, "reranker" | "reranking_status">;

export type RagCitation = RagCitationResponse;

export async function createAiDocument(payload: AiDocumentCreate): Promise<AiDocument> {
    return apiFetch("/ai/documents", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function uploadAiDocument(file: File, description?: string): Promise<AiDocument> {
    const formData = new FormData();
    formData.append("file", file);
    if (description) formData.append("description", description);
    return apiFetch("/ai/documents/upload", { method: "POST", body: formData });
}

export type RagAskResult = {
    query: string;
    answer: string;
    citations: RagCitation[];
    retrieved_chunk_ids: string[];
    model_name: string;
    latency_ms: number;
    no_context_found: boolean;
    ai_run_id: string | null;
    retrieval_degraded: boolean;
    memory_degraded: boolean;
    degradation_reason: string | null;
    injection_chunks_filtered: number;
} & Pick<RagAskResponse, "claims" | "citation_validation_status" | "citation_validation_failed">;

export function getRagCitationSource(citation: RagCitation): Promise<RagSourcePreviewResponse> {
    const params = new URLSearchParams();
    if (citation.index_revision_id != null) {
        params.set("revision_id", citation.index_revision_id);
    }
    const document = encodeURIComponent(citation.document_id);
    const chunk = encodeURIComponent(citation.chunk_id);
    return apiFetch(`${BASE}/documents/${document}/chunks/${chunk}/source?${params}`, {
        cache: "no-store",
    });
}

export type RagQueryHistoryItem = {
    id: string;
    query: string;
    answer: string;
    project_id: string | null;
    model_name: string;
    latency_ms: number;
    created_at: string;
};

export async function listRagDocuments(options: {
    projectId?: string;
    limit?: number;
    offset?: number;
    signal?: AbortSignal;
} = {}): Promise<Paginated<RagDocument>> {
    const search = paginationParams(options);
    if (options.projectId) search.set("project_id", options.projectId);
    return apiFetch(`${BASE}/documents?${search}`, { signal: options.signal });
}

export async function uploadRagDocument(
    file: File,
    projectId?: string
): Promise<RagDocumentUpload> {
    const form = new FormData();
    form.append("file", file);
    if (projectId) form.append("project_id", projectId);
    return apiFetch(`${BASE}/documents/upload`, { method: "POST", body: form });
}

export async function deleteRagDocument(documentId: string): Promise<void> {
    await apiFetch(`${BASE}/documents/${encodeURIComponent(documentId)}`, {
        method: "DELETE",
    });
}

export async function indexRagDocument(documentId: string): Promise<RagIngestionJob> {
    return apiFetch(`${BASE}/documents/${encodeURIComponent(documentId)}/index`, {
        method: "POST",
    });
}

export async function listRagChunks(
    documentId: string,
    options: { limit?: number; offset?: number; contentMode?: "snippet" | "full"; signal?: AbortSignal } = {}
): Promise<Paginated<RagChunk>> {
    const search = paginationParams(options);
    search.set("content_mode", options.contentMode ?? "snippet");
    return apiFetch(`${BASE}/documents/${encodeURIComponent(documentId)}/chunks?${search}`, { signal: options.signal });
}

export function compareRagRetrieval(
    payload: RagCompareRequest,
    signal: AbortSignal,
): Promise<RagCompareResponse> {
    return apiFetch(`${BASE}/retrieve/compare`, {
        method: "POST",
        body: JSON.stringify(payload),
        signal,
    });
}

export async function askRag(payload: {
    query: string;
    project_id?: string;
    run_id?: string;
    agent_id?: string;
    document_ids?: string[];
}): Promise<RagAskResult> {
    return apiFetch(`${BASE}/ask`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function listRagQueries(options: {
    limit?: number;
    offset?: number;
    signal?: AbortSignal;
} = {}): Promise<Paginated<RagQueryHistoryItem>> {
    const search = new URLSearchParams();
    search.set("limit", String(options.limit ?? 20));
    search.set("offset", String(options.offset ?? 0));
    return apiFetch(`${BASE}/queries?${search}`, { signal: options.signal });
}

export async function getRagIngestionJob(jobId: string, options?: ApiRequestOptions): Promise<RagIngestionJob> {
    return apiFetch(`${BASE}/jobs/${encodeURIComponent(jobId)}`, options);
}
