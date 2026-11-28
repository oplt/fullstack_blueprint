import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAgentRun, getAgentRun, listAgentRuns } from "@/features/agents/api";
import { getAiOverview } from "@/features/ai/overviewApi";
import { listProjects } from "@/features/projects/api";
import { listRagDocuments } from "@/features/rag/api";
import { queryKeys } from "../../lib/queryKeys";
import { QUERY_STALE_TIMES } from "../../lib/queryTiming";
import { notify } from "../../lib/notify";
import { getQueryErrorMessage } from "../../lib/queryErrors";
import { invalidateAgentRunQueries } from "./agentQueryUtils";

type AgentWorkspaceParams = {
    agentId: string;
    projectId: string;
    userMessage: string;
    promptTemplateKey: string;
    retrievalQuery: string;
    selectedDocumentIds: string[];
    topK: number;
    selectedRunId: string | null;
    activeTab: "configure" | "run" | "trace" | "sources" | "output";
    ragEnabled: boolean;
    projectsEnabled: boolean;
    setTab: (tab: "configure" | "run" | "trace" | "sources" | "output") => void;
    setRunStartedAt: (value: number | null) => void;
    setElapsedMs: (value: number) => void;
    setSelectedRunId: (value: string | null) => void;
};

export function useAgentWorkspace(params: AgentWorkspaceParams) {
    const client = useQueryClient();
    const overviewQuery = useQuery({
        queryKey: queryKeys.ai.overview,
        queryFn: ({ signal }) => getAiOverview({ signal }),
    });
    const projectsQuery = useQuery({
        queryKey: queryKeys.projects.all,
        queryFn: ({ signal }) => listProjects({ signal }),
        enabled: params.projectsEnabled,
    });
    const documentsQuery = useQuery({
        enabled: params.ragEnabled && params.activeTab === "configure",
        queryKey: queryKeys.rag.documents(params.projectId || undefined, 0),
        queryFn: ({ signal }) => listRagDocuments({
            projectId: params.projectId || undefined,
            limit: 50,
            offset: 0,
            signal,
        }),
    });
    const templates = overviewQuery.data?.prompt_templates ?? [];
    const providers = overviewQuery.data?.providers ?? [];
    const selectedTemplate = templates.find((template) => template.key === params.promptTemplateKey) ?? null;
    const runsQuery = useQuery({
        enabled: params.activeTab === "run",
        queryKey: queryKeys.agent.runs,
        queryFn: ({ signal }) => listAgentRuns({ limit: 30, signal }),
        staleTime: QUERY_STALE_TIMES.agentRuns,
    });
    const selectedRunQuery = useQuery({
        queryKey: queryKeys.agent.run(params.selectedRunId ?? ""),
        queryFn: ({ signal }) => getAgentRun(params.selectedRunId!, { signal }),
        enabled: Boolean(params.selectedRunId),
    });
    const runMutation = useMutation({
        mutationFn: () => createAgentRun({
            agent_id: params.agentId.trim() || "default",
            project_id: params.projectId || undefined,
            user_message: params.userMessage.trim() || undefined,
            prompt_template_key: params.promptTemplateKey || undefined,
            retrieval_query: params.ragEnabled ? params.retrievalQuery.trim() || params.userMessage.trim() || undefined : undefined,
            document_ids: params.selectedDocumentIds,
            top_k: params.topK,
        }),
        onMutate: () => {
            params.setRunStartedAt(Date.now());
            params.setElapsedMs(0);
            params.setTab("run");
        },
        onSuccess: async (run) => {
            params.setSelectedRunId(run.id);
            params.setRunStartedAt(null);
            params.setTab("output");
            await invalidateAgentRunQueries(client, run.id);
            notify({ message: "Agent run completed.", severity: "success" });
        },
        onError: (error) => {
            params.setRunStartedAt(null);
            notify({ message: getQueryErrorMessage(error, "Agent run failed."), severity: "error" });
        },
    });
    return { overviewQuery, projectsQuery, documentsQuery, templates, providers, selectedTemplate, runsQuery, selectedRunQuery, runMutation };
}
