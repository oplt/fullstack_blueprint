import { Button } from "@/components/ui/button";import { FormField } from "@/components/ui/form-field";import { useEffect, useMemo, useRef, useState } from "react";
import {
    CloudUpload as UploadIcon,
    Refresh as RetryIcon,
    Search as RetrieveIcon,
    QuestionAnswer as AskIcon,
} from "@/components/ui/iconsCompat";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "../../app/snackbarContext";
import { listProjects } from "../../api/projects";
import {
    askRag,
    deleteRagDocument,
    getRagIngestionJob,
    indexRagDocument,
    listRagChunks,
    listRagDocuments,
    listRagQueries,
    retrieveRagChunks,
    uploadRagDocument,
    type RagAskResult,
    type RagRetrieveResult,
} from "../../api/rag";
import { EmptyState } from "../../components/ui/EmptyState";
import { HelpFieldLabel, HelpTooltip } from "../../components/ui/HelpTooltip";
import { KeyValueList } from "../../components/ui/KeyValueList";
import { MetricGrid } from "../../components/ui/MetricGrid";
import { PageHeader } from "../../components/ui/PageHeader";
import { PageShell } from "../../components/ui/PageShell";
import { PageTabs } from "../../components/ui/PageTabs";
import { QueryBoundary, QueryErrorAlert } from "../../components/ui/QueryBoundary";
import { DataTable } from "../../components/ui/DataTable";
import { RunStatusChip } from "../../components/ui/RunStatusChip";
import { RunStatusPanel } from "../../components/ui/RunStatusPanel";
import { SectionCard } from "../../components/ui/SectionCard";
import { PaginationControls } from "../../components/ui/pagination";
import { SettingsTabs } from "../../components/layout/SettingsTabs";
import { queryKeys } from "../../config/queryKeys";
import { useTabQueryParam } from "../../hooks/useTabQueryParam";
import { getQueryErrorMessage } from "../../utils/queryErrors";
import {
    documentPipelineLabel,
    formatCoverage,
    indexingParamsFromChunkMeta,
    summarizeRagAsk,
} from "./ragEvaluationSummary";

const PAGE_SIZE = 20;
const TERMINAL_JOB = new Set(["completed", "failed", "cancelled"]);
const RAG_TABS = ["documents", "indexing", "retrieval", "evaluation", "runs"] as const;

function MetricTile({
    label,
    value,
    helpTermId,
    description,
}: {
    label: string;
    value: string | number;
    helpTermId?: string;
    description?: string;
}) {
    return (
        <div className="metric-tile h-full">
            <span className="text-muted-foreground">
                {helpTermId ? (
                    <HelpTooltip termId={helpTermId} variant="label">
                        {label}
                    </HelpTooltip>
                ) : (
                    label
                )}
            </span>
            <h6>{value}</h6>
            {description ? (
                <span className="text-muted-foreground">
                    {description}
                </span>
            ) : null}
        </div>
    );
}

export default function RagView() {
    const client = useQueryClient();
    const { showToast } = useSnackbar();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [projectId, setProjectId] = useState("");
    const [docOffset, setDocOffset] = useState(0);
    const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
    const [chunkOffset, setChunkOffset] = useState(0);
    const [pollJobId, setPollJobId] = useState<string | null>(null);
    const [retrieveQuery, setRetrieveQuery] = useState("");
    const [topK, setTopK] = useState(5);
    const [askQuery, setAskQuery] = useState("");
    const [retrieveResult, setRetrieveResult] = useState<RagRetrieveResult | null>(null);
    const [askResult, setAskResult] = useState<RagAskResult | null>(null);
    const [historyOffset, setHistoryOffset] = useState(0);
    const [tab, setTab] = useTabQueryParam(RAG_TABS, "documents");

    const projectsQuery = useQuery({
        queryKey: queryKeys.projects.all,
        queryFn: ({ signal }) => listProjects({ signal }),
    });

    const documentsQuery = useQuery({
        queryKey: queryKeys.rag.documents(projectId || undefined, docOffset),
        queryFn: ({ signal }) =>
            listRagDocuments({
                projectId: projectId || undefined,
                limit: PAGE_SIZE,
                offset: docOffset,
                signal,
            }),
    });

    const chunksQuery = useQuery({
        queryKey: queryKeys.rag.chunks(selectedDocumentId ?? "", chunkOffset),
        queryFn: ({ signal }) =>
            listRagChunks(selectedDocumentId!, {
                limit: PAGE_SIZE,
                offset: chunkOffset,
                contentMode: "snippet",
                signal,
            }),
        enabled: Boolean(selectedDocumentId),
    });

    const jobQuery = useQuery({
        queryKey: queryKeys.rag.job(pollJobId ?? ""),
        queryFn: ({ signal }) => getRagIngestionJob(pollJobId!, { signal }),
        enabled: Boolean(pollJobId),
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            if (status && TERMINAL_JOB.has(status)) return false;
            return 2000;
        },
    });

    const historyQuery = useQuery({
        queryKey: queryKeys.rag.queries(historyOffset),
        queryFn: ({ signal }) => listRagQueries({ limit: PAGE_SIZE, offset: historyOffset, signal }),
    });

    useEffect(() => {
        if (!jobQuery.data || !TERMINAL_JOB.has(jobQuery.data.status)) return;
        void client.invalidateQueries({ queryKey: queryKeys.rag.all });
        if (jobQuery.data.status === "completed") {
            showToast({ message: "Indexing completed.", severity: "success" });
        } else if (jobQuery.data.status === "failed") {
            showToast({
                message: jobQuery.data.error_message || "Indexing failed.",
                severity: "error",
            });
        }
        const clearPoll = window.setTimeout(() => setPollJobId(null), 0);
        return () => window.clearTimeout(clearPoll);
    }, [client, jobQuery.data, showToast]);

    const uploadMutation = useMutation({
        mutationFn: (file: File) => uploadRagDocument(file, projectId || undefined),
        onSuccess: async (result) => {
            setPollJobId(result.ingestion_job.id);
            setSelectedDocumentId(result.document.id);
            await client.invalidateQueries({
                queryKey: queryKeys.rag.documents(projectId || undefined, docOffset),
            });
            showToast({ message: "Upload accepted; indexing queued.", severity: "success" });
            setTab("indexing");
        },
        onError: (error) =>
            showToast({
                message: getQueryErrorMessage(error, "Upload failed."),
                severity: "error",
            }),
    });

    const indexMutation = useMutation({
        mutationFn: (documentId: string) => indexRagDocument(documentId),
        onSuccess: (job) => {
            setPollJobId(job.id);
            showToast({ message: "Re-index queued.", severity: "success" });
            setTab("indexing");
        },
        onError: (error) =>
            showToast({
                message: getQueryErrorMessage(error, "Re-index failed."),
                severity: "error",
            }),
    });

    const deleteMutation = useMutation({
        mutationFn: (documentId: string) => deleteRagDocument(documentId),
        onSuccess: async () => {
            setSelectedDocumentId(null);
            await client.invalidateQueries({ queryKey: queryKeys.rag.all });
            showToast({ message: "Document deleted.", severity: "success" });
        },
        onError: (error) =>
            showToast({
                message: getQueryErrorMessage(error, "Delete failed."),
                severity: "error",
            }),
    });

    const retrieveMutation = useMutation({
        mutationFn: () =>
            retrieveRagChunks({
                query: retrieveQuery.trim(),
                project_id: projectId || undefined,
                document_ids: selectedDocumentId ? [selectedDocumentId] : undefined,
                top_k: topK,
            }),
        onSuccess: (result) => setRetrieveResult(result),
        onError: (error) =>
            showToast({
                message: getQueryErrorMessage(error, "Retrieve failed."),
                severity: "error",
            }),
    });

    const askMutation = useMutation({
        mutationFn: () =>
            askRag({
                query: askQuery.trim(),
                project_id: projectId || undefined,
                document_ids: selectedDocumentId ? [selectedDocumentId] : undefined,
            }),
        onSuccess: async (result) => {
            setAskResult(result);
            await client.invalidateQueries({ queryKey: ["rag", "queries"] });
        },
        onError: (error) =>
            showToast({
                message: getQueryErrorMessage(error, "Ask failed."),
                severity: "error",
            }),
    });

    const documents = useMemo(() => documentsQuery.data?.items ?? [], [documentsQuery.data?.items]);
    const selectedDocument = useMemo(
        () => documents.find((d) => d.id === selectedDocumentId) ?? null,
        [documents, selectedDocumentId]
    );
    const indexingParams = useMemo(
        () => indexingParamsFromChunkMeta(chunksQuery.data?.items?.[0]?.metadata),
        [chunksQuery.data?.items]
    );
    const askEval = useMemo(
        () => (askResult ? summarizeRagAsk(askResult) : null),
        [askResult]
    );
    const projectNameById = useMemo(() => {
        const map = new Map<string, string>();
        for (const project of projectsQuery.data ?? []) {
            map.set(project.id, project.name);
        }
        return map;
    }, [projectsQuery.data]);

    return (
        <PageShell maxWidth="xl">
            <PageHeader
                title="RAG workspace"
                description="Manage documents and inspect indexing, retrieval, and evaluation."
            />
            <SettingsTabs />

            <div className="flex gap-[16px]" style={{ marginTop: 16 }}>
                <div
                    className="flex flex-col sm:flex-row gap-[12px] sm:items-center justify-between">
                    <p className="text-muted-foreground">
                        Optionally limit documents and retrieval to one project.
                    </p>
                    <FormField
                        select
                        label="Project / index scope"
                        value={projectId}
                        onChange={(e: any) => {
                            setProjectId(e.target.value);
                            setDocOffset(0);
                            setSelectedDocumentId(null);
                        }}>
                        <option>All projects</option>
                        {(projectsQuery.data ?? []).map((project) => (
                            <option key={project.id}>
                                {project.name}
                            </option>
                        ))}
                    </FormField>
                </div>

                <PageTabs
                    value={tab}
                    onChange={setTab}
                    tabs={[
                        { value: "documents", label: "Documents" },
                        { value: "indexing", label: "Indexing" },
                        { value: "retrieval", label: "Retrieval" },
                        { value: "evaluation", label: "Evaluation" },
                        { value: "runs", label: "Runs" },
                    ]}
                    ariaLabel="RAG workspace"
                />

                {tab === "documents" ? (
                    <SectionCard
                        title="Documents"
                        description="Upload sources and monitor parsing + indexing state before retrieval."
                        action={
                            <>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    hidden
                                    onChange={(e: any) => {
                                        const file = e.target.files?.[0];
                                        if (file) uploadMutation.mutate(file);
                                        e.target.value = "";
                                    }}
                                />
                                <Button
                                    variant="default"
                                    disabled={uploadMutation.isPending}
                                    onClick={() => fileInputRef.current?.click()}
                                    type="button"><UploadIcon />Upload
                                                                    </Button>
                            </>
                        }
                    >
                        {documentsQuery.isError ? (
                            <QueryErrorAlert
                                error={documentsQuery.error}
                                fallback="Failed to load RAG documents. RAG may be disabled."
                                onRetry={() => void documentsQuery.refetch()}
                            />
                        ) : (
                            <QueryBoundary isLoading={documentsQuery.isLoading} isError={false}>
                                <DataTable
                                    ariaLabel="RAG documents"
                                    columns={[
                                        {
                                            id: "document",
                                            label: "Document",
                                            sticky: "left",
                                            truncate: 48,
                                            sortable: true,
                                            getSortValue: (doc) =>
                                                doc.original_filename || doc.filename,
                                            render: (doc) =>
                                                doc.original_filename || doc.filename,
                                        },
                                        {
                                            id: "parsing",
                                            label: (
                                                <HelpTooltip
                                                    termId="parsing_state"
                                                    variant="label"
                                                >
                                                    Parsing
                                                </HelpTooltip>
                                            ),
                                            render: (doc) =>
                                                documentPipelineLabel(doc.status).parsing,
                                        },
                                        {
                                            id: "indexing",
                                            label: (
                                                <HelpTooltip
                                                    termId="indexing_state"
                                                    variant="label"
                                                >
                                                    Indexing
                                                </HelpTooltip>
                                            ),
                                            render: (doc) =>
                                                documentPipelineLabel(doc.status).indexing,
                                        },
                                        {
                                            id: "status",
                                            label: "Status",
                                            sortable: true,
                                            getSortValue: (doc) => doc.status,
                                            render: (doc) => (
                                                <RunStatusChip status={doc.status} showRaw />
                                            ),
                                        },
                                        {
                                            id: "updated",
                                            label: "Updated",
                                            sortable: true,
                                            hideable: true,
                                            getSortValue: (doc) => Date.parse(doc.updated_at),
                                            render: (doc) =>
                                                new Date(doc.updated_at).toLocaleString(),
                                        },
                                        {
                                            id: "actions",
                                            label: "Actions",
                                            align: "right",
                                            sticky: "right",
                                            hideable: false,
                                            render: (doc) => (
                                                <div
                                                    onClick={(e: any) => e.stopPropagation()}
                                                    className="flex flex-row gap-[4px] justify-end">
                                                    <Button
                                                        disabled={indexMutation.isPending}
                                                        onClick={() =>
                                                            indexMutation.mutate(doc.id)
                                                        }
                                                        type="button"><RetryIcon />Re-index
                                                                                                            </Button>
                                                    <Button
                                                        variant="destructive"
                                                        disabled={deleteMutation.isPending}
                                                        onClick={() => {
                                                            if (
                                                                window.confirm(
                                                                    "Delete this RAG document?"
                                                                )
                                                            ) {
                                                                deleteMutation.mutate(doc.id);
                                                            }
                                                        }}
                                                        type="button">
                                                        Delete
                                                    </Button>
                                                </div>
                                            ),
                                        },
                                    ]}
                                    rows={documents}
                                    getRowId={(doc) => doc.id}
                                    density="compact"
                                    showDensityToggle
                                    showColumnVisibility
                                    stickyHeader
                                    stickyFirstColumn
                                    clientSort
                                    page={Math.floor(docOffset / PAGE_SIZE)}
                                    pageSize={PAGE_SIZE}
                                    totalCount={documentsQuery.data?.total ?? 0}
                                    onPageChange={(page) => setDocOffset(page * PAGE_SIZE)}
                                    selectedRowId={selectedDocumentId}
                                    onRowClick={(doc) => {
                                        setSelectedDocumentId(doc.id);
                                        setChunkOffset(0);
                                        setTab("indexing");
                                    }}
                                    emptyIcon={<UploadIcon />}
                                    emptyTitle="No RAG documents"
                                    emptyDescription="Upload a file to start parsing, chunking, and indexing."
                                />
                            </QueryBoundary>
                        )}
                        {pollJobId && jobQuery.data ? (
                            <div style={{ marginTop: 8 }}>
                                <RunStatusPanel
                                    dense
                                    title="Ingestion job"
                                    status={jobQuery.data.status}
                                    runId={jobQuery.data.id}
                                    stage="parse → chunk → embed"
                                    startedAt={jobQuery.data.started_at}
                                    completedAt={jobQuery.data.finished_at}
                                    createdAt={jobQuery.data.created_at}
                                    errorMessage={jobQuery.data.error_message}
                                    onRetry={
                                        selectedDocumentId
                                            ? () => indexMutation.mutate(selectedDocumentId)
                                            : undefined
                                    }
                                    retryLabel="Re-index"
                                    retryDisabled={indexMutation.isPending}
                                />
                            </div>
                        ) : null}
                    </SectionCard>
                ) : null}

                {tab === "indexing" ? (
                    <>
                        {!selectedDocument ? (
                            <SectionCard
                                title="Indexing"
                                description="Select a document to inspect embedding/chunk settings, progress, and chunks."
                            >
                                <EmptyState
                                    icon={<RetryIcon />}
                                    title="No document selected"
                                    description="Choose a document from Documents, then return here to browse chunks and indexing progress."
                                    action={
                                        <Button variant="default" onClick={() => setTab("documents")} type="button">
                                            Open Documents
                                        </Button>
                                    }
                                />
                            </SectionCard>
                        ) : (
                            <>
                                <SectionCard
                                    title="Indexing configuration"
                                    description={`Settings observed for ${
                                        selectedDocument.original_filename ||
                                        selectedDocument.filename
                                    }`}
                                    action={
                                        <Button
                                            disabled={indexMutation.isPending}
                                            onClick={() =>
                                                indexMutation.mutate(selectedDocument.id)
                                            }
                                            type="button"><RetryIcon />Re-index
                                                                                    </Button>
                                    }
                                >
                                    <div className="flex gap-[16px]">
                                        <MetricGrid columns={4}>
                                            <MetricTile
                                                label="Document status"
                                                value={selectedDocument.status}
                                                helpTermId="indexing_state"
                                            />
                                            <MetricTile
                                                label="Chunks"
                                                value={chunksQuery.data?.total ?? "—"}
                                                helpTermId="chunk_size"
                                                description="Indexed segments"
                                            />
                                            <MetricTile
                                                label="Parsing"
                                                value={
                                                    documentPipelineLabel(selectedDocument.status)
                                                        .parsing
                                                }
                                                helpTermId="parsing_state"
                                            />
                                            <MetricTile
                                                label="Job"
                                                value={jobQuery.data?.status ?? "idle"}
                                                description={
                                                    pollJobId ? "Live ingestion poll" : "No active job"
                                                }
                                            />
                                        </MetricGrid>

                                        {pollJobId && jobQuery.data ? (
                                            <RunStatusPanel
                                                title="Indexing progress"
                                                status={jobQuery.data.status}
                                                runId={jobQuery.data.id}
                                                stage="parse → chunk → embed"
                                                startedAt={jobQuery.data.started_at}
                                                completedAt={jobQuery.data.finished_at}
                                                createdAt={jobQuery.data.created_at}
                                                errorMessage={jobQuery.data.error_message}
                                                onRetry={() =>
                                                    indexMutation.mutate(selectedDocument.id)
                                                }
                                                retryLabel="Re-index"
                                                retryDisabled={indexMutation.isPending}
                                            />
                                        ) : null}

                                        {indexingParams.length ? (
                                            <KeyValueList
                                                showHelp
                                                items={indexingParams.map((row) => ({
                                                    key: row.key,
                                                    label: row.label,
                                                    value: row.value,
                                                    helpTermId: row.helpTermId,
                                                }))}
                                            />
                                        ) : (
                                            <div role="alert" className="rounded-lg border border-border p-3 text-sm">
                                                Embedding model,{" "}
                                                <HelpTooltip termId="chunk_size" variant="label">
                                                    chunk size
                                                </HelpTooltip>
                                                , and{" "}
                                                <HelpTooltip termId="chunk_overlap" variant="label">
                                                    overlap
                                                </HelpTooltip>{" "}
                                                appear here once chunks are available (from chunk
                                                provenance metadata).
                                            </div>
                                        )}
                                    </div>
                                </SectionCard>

                                <SectionCard
                                    title="Chunks"
                                    description="Browse indexed segments for this document."
                                >
                                    <QueryBoundary
                                        isLoading={chunksQuery.isLoading}
                                        isError={chunksQuery.isError}
                                        error={chunksQuery.error}
                                        onRetry={() => void chunksQuery.refetch()}
                                    >
                                        {(chunksQuery.data?.items ?? []).length === 0 ? (
                                            <p className="text-muted-foreground">
                                                No chunks yet — wait for indexing or re-index.
                                            </p>
                                        ) : (
                                            (chunksQuery.data?.items ?? []).map((chunk) => (
                                                <div
                                                    key={chunk.id}
                                                    style={{
                                                        paddingBlock: 8,
                                                        borderBottom: 1,
                                                        borderColor: "divider",
                                                    }}
                                                >
                                                    <span className="text-muted-foreground">
                                                        #{chunk.chunk_index} · {chunk.token_count}{" "}
                                                        tokens
                                                    </span>
                                                    <p>
                                                        {chunk.content}
                                                    </p>
                                                </div>
                                            ))
                                        )}
                                        <PaginationControls count={chunksQuery.data?.total ?? 0} page={Math.floor(chunkOffset / PAGE_SIZE)} rowsPerPage={PAGE_SIZE} onPageChange={(page) => setChunkOffset(page * PAGE_SIZE)} />
                                    </QueryBoundary>
                                </SectionCard>
                            </>
                        )}
                    </>
                ) : null}

                {tab === "retrieval" ? (
                    <SectionCard
                        title="Retrieval"
                        description="Run a retrieve-only query and inspect ranked chunks with similarity scores and sources."
                    >
                        <div className="flex gap-[12px]">
                            <div className="flex flex-col sm:flex-row gap-[16px] sm:items-start">
                                <FormField
                                    label="Query"
                                    value={retrieveQuery}
                                    onChange={(e: any) => setRetrieveQuery(e.target.value)} />
                                <FormField
                                    type="number"
                                    label={
                                        <HelpFieldLabel termId="top_k_retrieval">
                                            Top-k
                                        </HelpFieldLabel>
                                    }
                                    value={topK}
                                    onChange={(e: any) =>
                                        setTopK(Math.max(1, Math.min(50, Number(e.target.value) || 1)))
                                    }
                                    inputProps={{ min: 1, max: 50, step: 1 }} />
                            </div>
                            {selectedDocumentId ? (
                                <span className="text-muted-foreground">
                                    Scoped to selected document. Clear selection on Documents to
                                    search the full project scope.
                                </span>
                            ) : null}
                            <Button
                                variant="default"
                                disabled={!retrieveQuery.trim() || retrieveMutation.isPending}
                                onClick={() => retrieveMutation.mutate()}
                                type="button"><RetrieveIcon />Retrieve
                                                            </Button>
                            {retrieveResult ? (
                                <div className="flex gap-[8px]">
                                    {retrieveResult.degraded || retrieveResult.no_matches ? (
                                        <div role="alert" className="rounded-lg border border-border p-3 text-sm">
                                            {retrieveResult.degraded
                                                ? `Degraded: ${
                                                      retrieveResult.degradation_reason ?? "unknown"
                                                  }`
                                                : "No matches"}
                                            {retrieveResult.injection_chunks_filtered
                                                ? ` · filtered ${retrieveResult.injection_chunks_filtered} injection chunk(s)`
                                                : ""}
                                        </div>
                                    ) : null}
                                    <p>
                                        Retrieved chunks ({retrieveResult.chunks.length})
                                    </p>
                                    <div style={{ overflowX: "auto" }}>
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-border">
                                                    <td className="p-2 align-top">Rank</td>
                                                    <td className="p-2 align-top">Document source</td>
                                                    <td className="p-2 align-top">Page</td>
                                                    <td className="p-2 align-top">
                                                        <HelpTooltip
                                                            termId="similarity_threshold"
                                                            variant="label"
                                                        >
                                                            Similarity
                                                        </HelpTooltip>
                                                    </td>
                                                    <td className="p-2 align-top">Chunk</td>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {retrieveResult.chunks.map((chunk, index) => (
                                                    <tr key={chunk.chunk_id} className="border-b border-border">
                                                        <td className="p-2 align-top">{index + 1}</td>
                                                        <td className="p-2 align-top">{chunk.filename}</td>
                                                        <td className="p-2 align-top">
                                                            {chunk.page_number ?? "—"}
                                                        </td>
                                                        <td className="p-2 align-top">
                                                            {chunk.score.toFixed(3)}
                                                        </td>
                                                        <td style={{ maxWidth: 420 }} className="p-2 align-top">
                                                            <p>
                                                                {chunk.content.slice(0, 280)}
                                                                {chunk.content.length > 280
                                                                    ? "…"
                                                                    : ""}
                                                            </p>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </SectionCard>
                ) : null}

                {tab === "evaluation" ? (
                    <SectionCard
                        title="Evaluation"
                        description="Grounded ask with citation coverage and retrieval-relevance signals for this response."
                    >
                        <div className="flex gap-[12px]">
                            <FormField
                                label="Question"
                                value={askQuery}
                                onChange={(e: any) => setAskQuery(e.target.value)}
                                multiline
                                rows={2} />
                            <Button
                                variant="default"
                                disabled={!askQuery.trim() || askMutation.isPending}
                                onClick={() => askMutation.mutate()}
                                type="button"><AskIcon />Ask (grounded)
                                                            </Button>
                            {askResult && askEval ? (
                                <div className="flex gap-[12px]">
                                    <MetricGrid columns={4}>
                                        <MetricTile
                                            label="Retrieved chunks"
                                            value={askEval.retrievedCount}
                                            helpTermId="top_k_retrieval"
                                        />
                                        <MetricTile
                                            label="Citations"
                                            value={askEval.citationCount}
                                            helpTermId="grounding"
                                        />
                                        <MetricTile
                                            label="Citation coverage"
                                            value={formatCoverage(askEval.citationCoverage)}
                                            helpTermId="citation_coverage"
                                            description="Cited ÷ retrieved"
                                        />
                                        <MetricTile
                                            label="Documents cited"
                                            value={askEval.distinctDocuments}
                                            description={
                                                askEval.meanCitationScore != null
                                                    ? `Mean score ${askEval.meanCitationScore.toFixed(3)}`
                                                    : undefined
                                            }
                                        />
                                    </MetricGrid>

                                    {askEval.groundingNotes.map((note) => (
                                        <div
                                            key={note}
                                            role="alert"
                                            className="rounded-lg border border-border p-3 text-sm">
                                            {note}
                                        </div>
                                    ))}

                                    {(askResult.retrieval_degraded ||
                                        askResult.memory_degraded ||
                                        askResult.no_context_found) && (
                                        <div role="alert" className="rounded-lg border border-border p-3 text-sm">
                                            {askResult.no_context_found
                                                ? "No context found. "
                                                : ""}
                                            {askResult.degradation_reason ??
                                                (askResult.retrieval_degraded
                                                    ? "Retrieval degraded."
                                                    : askResult.memory_degraded
                                                      ? "Memory degraded."
                                                      : "")}
                                        </div>
                                    )}

                                    <p>Answer</p>
                                    <p>{askResult.answer}</p>
                                    <span className="text-muted-foreground">
                                        {askResult.model_name} · {askResult.latency_ms} ms
                                    </span>

                                    <p>
                                        <HelpTooltip termId="grounding" variant="label">
                                            Citations (evidence)
                                        </HelpTooltip>
                                    </p>
                                    {askResult.citations.map((citation) => (
                                        <div
                                            key={`${citation.document_id}:${citation.chunk_id}`}
                                            style={{
                                                padding: 8,
                                                border: 1,
                                                borderColor: "divider",
                                                borderRadius: 4,
                                            }}
                                        >
                                            <span className="text-muted-foreground">
                                                {citation.filename} · score{" "}
                                                {citation.score.toFixed(3)}
                                                {citation.page_number != null
                                                    ? ` · p.${citation.page_number}`
                                                    : ""}
                                            </span>
                                            <p>
                                                {citation.snippet}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </SectionCard>
                ) : null}

                {tab === "runs" ? (
                    <SectionCard
                        title="Runs"
                        description="Recent RAG asks with timestamp, model, scope, status, and duration."
                    >
                        <QueryBoundary
                            isLoading={historyQuery.isLoading}
                            isError={historyQuery.isError}
                            error={historyQuery.error}
                            onRetry={() => void historyQuery.refetch()}
                        >
                            <div style={{ overflowX: "auto" }}>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <td className="p-2 align-top">Timestamp</td>
                                            <td className="p-2 align-top">Query</td>
                                            <td className="p-2 align-top">Model</td>
                                            <td className="p-2 align-top">Project / index</td>
                                            <td className="p-2 align-top">Status</td>
                                            <td className="p-2 align-top">Duration</td>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(historyQuery.data?.items ?? []).map((item) => (
                                            <tr key={item.id} className="border-b border-border">
                                                <td className="p-2 align-top">
                                                    {new Date(item.created_at).toLocaleString()}
                                                </td>
                                                <td style={{ maxWidth: 320 }} className="p-2 align-top">
                                                    {item.query}
                                                </td>
                                                <td className="p-2 align-top">{item.model_name}</td>
                                                <td className="p-2 align-top">
                                                    {item.project_id
                                                        ? projectNameById.get(item.project_id) ??
                                                          item.project_id.slice(0, 8)
                                                        : "All / default"}
                                                </td>
                                                <td className="p-2 align-top">
                                                    <div
                                                        className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />
                                                </td>
                                                <td className="p-2 align-top">{item.latency_ms} ms</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <PaginationControls count={historyQuery.data?.total ?? 0} page={Math.floor(historyOffset / PAGE_SIZE)} rowsPerPage={PAGE_SIZE} onPageChange={(page) => setHistoryOffset(page * PAGE_SIZE)} />
                        </QueryBoundary>
                    </SectionCard>
                ) : null}
            </div>
        </PageShell>
    );
}
