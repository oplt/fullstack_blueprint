import { apiFetch, type Paginated } from "../client";

export type AiDocument = {
    id: string;
    title: string;
    description: string | null;
    filename: string | null;
    content_type: string;
    size_bytes: number;
    ingestion_status: string;
    metadata: Record<string, unknown>;
    chunk_count: number;
    created_at: string;
    updated_at: string;
};

type AiChunkMatch = {
    document_id: string;
    chunk_id: string;
    document_title: string;
    chunk_index: number;
    score: number;
    content: string;
};

export async function listAiDocuments(params?: {
    limit?: number;
    offset?: number;
}): Promise<Paginated<AiDocument>> {
    const search = new URLSearchParams();
    if (params?.limit != null) search.set("limit", String(params.limit));
    if (params?.offset != null) search.set("offset", String(params.offset));
    const qs = search.toString();
    return apiFetch(`/ai/documents${qs ? `?${qs}` : ""}`);
}

export async function getAiDocument(documentId: string): Promise<AiDocument> {
    return apiFetch(`/ai/documents/${documentId}`);
}

export async function createAiDocument(payload: {
    title: string;
    description?: string;
    content: string;
    content_type?: string;
    metadata?: Record<string, unknown>;
}): Promise<AiDocument> {
    return apiFetch("/ai/documents", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function uploadAiDocument(file: File, description?: string): Promise<AiDocument> {
    const formData = new FormData();
    formData.append("file", file);
    if (description) {
        formData.append("description", description);
    }
    return apiFetch("/ai/documents/upload", {
        method: "POST",
        body: formData,
    });
}

export async function retrieveAiChunks(payload: {
    query: string;
    document_ids: string[];
    top_k: number;
}): Promise<AiChunkMatch[]> {
    return apiFetch("/ai/retrieve", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}
