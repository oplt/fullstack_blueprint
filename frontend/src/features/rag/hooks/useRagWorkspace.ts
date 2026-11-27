import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listProjects } from "../../../api/projects";
import {
    askRag, deleteRagDocument, getRagIngestionJob, indexRagDocument,
    listRagChunks, listRagDocuments, listRagQueries,
    uploadRagDocument, type RagAskResult,
} from "../../../api/rag";
import { queryKeys } from "../../../config/queryKeys";
import { jobPollInterval } from "../../../config/queryTiming";
import { getQueryErrorMessage } from "../../../utils/queryErrors";
import { notify } from "../../../lib/notify";
import { indexingParamsFromChunkMeta, summarizeRagAsk } from "../ragEvaluationSummary";
import { useApplicationConfiguration } from "@/config/application/useConfiguration";
import { capabilityAvailability, serverStateFromPlatformMetadata } from "@/config/application/capabilities";
import { usePlatformMetadata } from "../../../hooks/usePlatformMetadata";

export const PAGE_SIZE = 20;
const TERMINAL_JOB = new Set(["completed", "failed", "cancelled"]);

type RagTab = "documents" | "indexing" | "retrieval" | "evaluation" | "runs";

export function useRagWorkspace(activeTab: RagTab, setTab: (tab: RagTab) => void) {
    const client = useQueryClient();
    const configuration = useApplicationConfiguration();
    const { data: platformMetadata } = usePlatformMetadata();
    const projectsEnabled = capabilityAvailability(
        "projects",
        configuration,
        serverStateFromPlatformMetadata(platformMetadata),
    ).available;
    const [projectId, setProjectId] = useState("");
    const [docOffset, setDocOffset] = useState(0);
    const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
    const [chunkOffset, setChunkOffset] = useState(0);
    const [pollJobId, setPollJobId] = useState<string | null>(null);
    const [askQuery, setAskQuery] = useState("");
    const [askResult, setAskResult] = useState<RagAskResult | null>(null);
    const [historyOffset, setHistoryOffset] = useState(0);

    const projectsQuery = useQuery({
        queryKey: queryKeys.projects.all,
        queryFn: ({ signal }) => listProjects({ signal }),
        enabled: projectsEnabled,
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
            const job = query.state.data;
            const status = job?.status;
            if (status && TERMINAL_JOB.has(status)) return false;
            const parsedCreatedAt = job?.created_at ? Date.parse(job.created_at) : Number.NaN;
            const createdAt = Number.isFinite(parsedCreatedAt) ? parsedCreatedAt : Date.now();
            return jobPollInterval(Math.max(0, Date.now() - createdAt));
        },
        refetchIntervalInBackground: false,
    });

    const historyQuery = useQuery({
        enabled: activeTab === "runs",
        queryKey: queryKeys.rag.queries(historyOffset),
        queryFn: ({ signal }) => listRagQueries({ limit: PAGE_SIZE, offset: historyOffset, signal }),
    });

    useEffect(() => {
        if (!jobQuery.data || !TERMINAL_JOB.has(jobQuery.data.status)) return;
        void client.invalidateQueries({ queryKey: queryKeys.rag.all });
        if (jobQuery.data.status === "completed") {
            notify({ message: "Indexing completed.", severity: "success" });
        } else if (jobQuery.data.status === "failed") {
            notify({
                message: jobQuery.data.error_message || "Indexing failed.",
                severity: "error",
            });
        }
        const clearPoll = window.setTimeout(() => setPollJobId(null), 0);
        return () => window.clearTimeout(clearPoll);
    }, [client, jobQuery.data]);

    const uploadMutation = useMutation({
        mutationFn: (file: File) => uploadRagDocument(file, projectId || undefined),
        onSuccess: async (result) => {
            setPollJobId(result.ingestion_job.id);
            setSelectedDocumentId(result.document.id);
            await client.invalidateQueries({
                queryKey: queryKeys.rag.documents(projectId || undefined, docOffset),
            });
            notify({ message: "Upload accepted; indexing queued.", severity: "success" });
            setTab("indexing");
        },
        onError: (error) =>
            notify({
                message: getQueryErrorMessage(error, "Upload failed."),
                severity: "error",
            }),
    });

    const indexMutation = useMutation({
        mutationFn: (documentId: string) => indexRagDocument(documentId),
        onSuccess: (job) => {
            setPollJobId(job.id);
            notify({ message: "Re-index queued.", severity: "success" });
            setTab("indexing");
        },
        onError: (error) =>
            notify({
                message: getQueryErrorMessage(error, "Re-index failed."),
                severity: "error",
            }),
    });

    const deleteMutation = useMutation({
        mutationFn: (documentId: string) => deleteRagDocument(documentId),
        onSuccess: async () => {
            setSelectedDocumentId(null);
            await client.invalidateQueries({ queryKey: queryKeys.rag.all });
            notify({ message: "Document deleted.", severity: "success" });
        },
        onError: (error) =>
            notify({
                message: getQueryErrorMessage(error, "Delete failed."),
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
            notify({
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

    return {
        projectId, setProjectId, docOffset, setDocOffset, selectedDocumentId,
        setSelectedDocumentId, chunkOffset, setChunkOffset, pollJobId, setPollJobId,
        askQuery, setAskQuery, askResult, historyOffset, setHistoryOffset, projectsEnabled, projectsQuery,
        documentsQuery, chunksQuery, jobQuery, historyQuery, uploadMutation,
        indexMutation, deleteMutation, askMutation, documents,
        selectedDocument, indexingParams, askEval, projectNameById,
    };
}
