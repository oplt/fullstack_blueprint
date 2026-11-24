import { Button } from "@/components/ui/button";import { FormField } from "@/components/ui/form-field";import { useEffect, useMemo, useState } from "react";
import { SmartToy as AgentIcon, PlayArrow as RunIcon } from "@/components/ui/iconsCompat";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "../../app/snackbarContext";
import { createAgentRun, getAgentRun, listAgentRuns, formatAgentCostMicros } from "../../api/agent";
import { getAiOverview } from "../../api/ai";
import { listProjects } from "../../api/projects";
import { usePlatformMetadata } from "../../hooks/usePlatformMetadata";
import { listRagDocuments } from "../../api/rag";
import { AdvancedSettings } from "../../components/ui/AdvancedSettings";
import { DisabledWithReason } from "../../components/ui/DisabledWithReason";
import { EmptyState } from "../../components/ui/EmptyState";
import { HelpFieldLabel, HelpTooltip } from "../../components/ui/HelpTooltip";
import { JsonBlock } from "../../components/ui/JsonBlock";
import { KeyValueList } from "../../components/ui/KeyValueList";
import { PageHeader } from "../../components/ui/PageHeader";
import { PageShell } from "../../components/ui/PageShell";
import { PageTabs } from "../../components/ui/PageTabs";
import { QueryBoundary } from "../../components/ui/QueryBoundary";
import { RunStatusChip } from "../../components/ui/RunStatusChip";
import { RunStatusPanel } from "../../components/ui/RunStatusPanel";
import { SectionCard } from "../../components/ui/SectionCard";
import { recordToKeyValueItems } from "../../components/ui/jsonDisplay";
import { SettingsTabs } from "../../components/layout/SettingsTabs";
import { queryKeys } from "../../config/queryKeys";
import { useTabQueryParam } from "../../hooks/useTabQueryParam";
import { getQueryErrorMessage } from "../../utils/queryErrors";
import { invalidateAgentRunQueries } from "./agentQueryUtils";
import {
    agentRunElapsedMs,
    buildAgentTraceSteps,
    formatElapsed,
} from "./agentTraceModel";

const AGENT_TABS = ["configure", "run", "trace", "sources", "output"] as const;

function agentRunDisabledReason(options: {
    message?: string;
    pending?: boolean;
}): string | null {
    if (options.pending) return "An agent run is already in progress.";
    if (!options.message?.trim()) return "Enter a task message before running the agent.";
    return null;
}

export default function AgentView() {
    const { showToast } = useSnackbar();
    const queryClient = useQueryClient();
    const { data: platform } = usePlatformMetadata();
    const ragEnabled = platform?.available_features?.includes("rag") ?? false;

    const [agentId, setAgentId] = useState("default");
    const [projectId, setProjectId] = useState("");
    const [userMessage, setUserMessage] = useState("");
    const [promptTemplateKey, setPromptTemplateKey] = useState("");
    const [retrievalQuery, setRetrievalQuery] = useState("");
    const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
    const [topK, setTopK] = useState(4);
    const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
    const [tab, setTab] = useTabQueryParam(AGENT_TABS, "configure");
    const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
    const [elapsedMs, setElapsedMs] = useState(0);

    const overviewQuery = useQuery({
        queryKey: queryKeys.ai.overview,
        queryFn: ({ signal }) => getAiOverview({ signal }),
    });

    const projectsQuery = useQuery({
        queryKey: queryKeys.projects.all,
        queryFn: ({ signal }) => listProjects({ signal }),
    });

    const documentsQuery = useQuery({
        enabled: ragEnabled,
        queryKey: queryKeys.rag.documents(projectId || undefined, 0),
        queryFn: ({ signal }) =>
            listRagDocuments({
                projectId: projectId || undefined,
                limit: 50,
                offset: 0,
                signal,
            }),
    });

    const templates = overviewQuery.data?.prompt_templates ?? [];
    const providers = overviewQuery.data?.providers ?? [];
    const selectedTemplate = templates.find((t: any) => t.key === promptTemplateKey) ?? null;

    const runsQuery = useQuery({
        queryKey: queryKeys.agent.runs,
        queryFn: ({ signal }) => listAgentRuns({ limit: 30, signal }),
    });

    const selectedRunQuery = useQuery({
        queryKey: queryKeys.agent.run(selectedRunId ?? ""),
        queryFn: ({ signal }) => getAgentRun(selectedRunId!, { signal }),
        enabled: Boolean(selectedRunId),
    });

    const runMutation = useMutation({
        mutationFn: () =>
            createAgentRun({
                agent_id: agentId.trim() || "default",
                project_id: projectId || undefined,
                user_message: userMessage.trim() || undefined,
                prompt_template_key: promptTemplateKey || undefined,
                retrieval_query: ragEnabled ? retrievalQuery.trim() || userMessage.trim() || undefined : undefined,
                document_ids: selectedDocumentIds,
                top_k: topK,
            }),
        onMutate: () => {
            setRunStartedAt(Date.now());
            setElapsedMs(0);
            setTab("run");
        },
        onSuccess: async (run) => {
            setSelectedRunId(run.id);
            setRunStartedAt(null);
            setTab("output");
            await invalidateAgentRunQueries(queryClient, run.id);
            showToast({ message: "Agent run completed.", severity: "success" });
        },
        onError: (error) => {
            setRunStartedAt(null);
            showToast({
                message: getQueryErrorMessage(error, "Agent run failed."),
                severity: "error",
            });
        },
    });

    useEffect(() => {
        if (!runMutation.isPending || runStartedAt == null) return;
        const tick = window.setInterval(() => {
            setElapsedMs(Date.now() - runStartedAt);
        }, 200);
        return () => window.clearInterval(tick);
    }, [runMutation.isPending, runStartedAt]);

    const history = runsQuery.data?.items ?? [];
    const selectedRun = selectedRunQuery.data ?? null;
    const traceSteps = useMemo(
        () => (selectedRun ? buildAgentTraceSteps(selectedRun) : []),
        [selectedRun]
    );

    const enabledTools = useMemo(() => {
        const tools = [
            { id: "generate", label: "Generate", enabled: true },
            {
                id: "retrieve",
                label: "RAG retrieve",
                enabled: ragEnabled && Boolean(retrievalQuery.trim() || userMessage.trim() || selectedDocumentIds.length),
            },
            { id: "memory", label: "Memory link", enabled: true },
        ];
        return tools;
    }, [ragEnabled, retrievalQuery, userMessage, selectedDocumentIds.length]);

    function toggleDocument(id: string) {
        setSelectedDocumentIds((ids) =>
            ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
        );
    }

    return (
        <PageShell maxWidth="xl">
            <PageHeader
                title="AI Agent"
                description="Transparent agent runs: configure tools and retrieval, watch progress, inspect structured trace and sources, then read the final output separately."
            />
            <SettingsTabs />

            <div className="flex gap-[16px]" style={{ marginTop: 16 }}>
                <PageTabs
                    value={tab}
                    onChange={setTab}
                    tabs={[
                        { value: "configure", label: "Configure" },
                        { value: "run", label: "Run" },
                        { value: "trace", label: "Trace" },
                        { value: "sources", label: "Sources" },
                        { value: "output", label: "Output" },
                    ]}
                    ariaLabel="Agent workflow"
                />

                {tab === "configure" ? (
                    <SectionCard
                        title="Configure"
                        description="Model, tools, prompt, limits, and retrieval — then continue to Run."
                    >
                        <div className="flex gap-[16px]">
                            <div role="alert" className="rounded-lg border border-border p-3 text-sm">
                                Execution is synchronous today (HTTP 201). The Run tab shows live
                                status until the backend responds or times out.
                            </div>

                            <p>
                                <HelpTooltip termId="model_family" variant="label">
                                    Model
                                </HelpTooltip>
                            </p>
                            <KeyValueList
                                showHelp
                                items={[
                                    {
                                        key: "agent_id",
                                        label: "Agent ID",
                                        value: agentId || "default",
                                    },
                                    {
                                        key: "providers",
                                        label: "Available providers",
                                        value: providers.length
                                            ? providers
                                                  .map((p) => `${p.label} (${p.key})`)
                                                  .join(", ")
                                            : "—",
                                        helpTermId: "model_family",
                                    },
                                    {
                                        key: "prompt_template",
                                        label: "Prompt template",
                                        value: selectedTemplate
                                            ? `${selectedTemplate.name} (${selectedTemplate.key})`
                                            : "Message only (no template)",
                                    },
                                ]}
                            />

                            <div className="flex flex-col sm:flex-row gap-[16px] flex-wrap">
                                <FormField
                                    label="Agent ID"
                                    value={agentId}
                                    onChange={(e: any) => setAgentId(e.target.value)} />
                                <FormField
                                    select
                                    label="Project"
                                    value={projectId}
                                    onChange={(e: any) => {
                                        setProjectId(e.target.value);
                                        setSelectedDocumentIds([]);
                                    }}>
                                    <option>None</option>
                                    {(projectsQuery.data ?? []).map((project) => (
                                        <option key={project.id}>
                                            {project.name}
                                        </option>
                                    ))}
                                </FormField>
                                <FormField
                                    select
                                    label="Prompt template"
                                    value={promptTemplateKey}
                                    onChange={(e: any) => setPromptTemplateKey(e.target.value)}>
                                    <option>None (message only)</option>
                                    {templates.map((template) => (
                                        <option key={template.id}>
                                            {template.name} ({template.key})
                                        </option>
                                    ))}
                                </FormField>
                            </div>

                            <div>
                                <p>
                                    <HelpTooltip termId="agent_tools" variant="label">
                                        Tools
                                    </HelpTooltip>
                                </p>
                                <div className="flex flex-row gap-[8px] flex-wrap">
                                    {enabledTools.map((tool) => (
                                        <div
                                            key={tool.id}
                                            className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />
                                    ))}
                                </div>
                                <span style={{ marginTop: 4 }} className="text-muted-foreground">
                                    Enabled tools appear as structured steps on the Trace tab after a
                                    run.
                                </span>
                            </div>

                            <p>Prompt</p>
                            <FormField
                                label="User message"
                                value={userMessage}
                                onChange={(e: any) => setUserMessage(e.target.value)}
                                multiline
                                rows={3} />

                            {ragEnabled && <>
                            <p>Limits & retrieval</p>
                            <div className="flex flex-col sm:flex-row gap-[16px] flex-wrap">
                                <FormField
                                    type="number"
                                    label={
                                        <HelpFieldLabel termId="top_k_retrieval">
                                            Top-k
                                        </HelpFieldLabel>
                                    }
                                    value={topK}
                                    onChange={(e: any) => setTopK(Number(e.target.value) || 4)}
                                    inputProps={{ min: 1, max: 20 }} />
                                <FormField
                                    label="Retrieval query (optional)"
                                    value={retrievalQuery}
                                    onChange={(e: any) => setRetrievalQuery(e.target.value)}
                                    helperText="Defaults to the user message when empty." />
                            </div>

                            <div>
                                <p>
                                    RAG documents (optional scope)
                                </p>
                                <QueryBoundary
                                    isLoading={documentsQuery.isLoading}
                                    isError={documentsQuery.isError}
                                    error={documentsQuery.error}
                                    onRetry={() => void documentsQuery.refetch()}
                                >
                                    {(documentsQuery.data?.items ?? []).length === 0 ? (
                                        <p className="text-muted-foreground">
                                            No RAG documents for this filter.
                                        </p>
                                    ) : (
                                        <div className="flex flex-row gap-[8px] flex-wrap">
                                            {(documentsQuery.data?.items ?? []).map((doc) => {                                                return (
                                                    <div
                                                        key={doc.id}
                                                        onClick={() => toggleDocument(doc.id)}
                                                        className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />
                                                );
                                            })}
                                        </div>
                                    )}
                                </QueryBoundary>
                            </div>

                            </>}
                            <Button
                                variant="default"
                                onClick={() => setTab("run")}
                                disabled={!userMessage.trim()}
                                type="button">
                                Continue to Run
                            </Button>
                        </div>
                    </SectionCard>
                ) : null}

                {tab === "run" ? (
                    <>
                        <SectionCard
                            title="Run"
                            description="Current task, step, progress, elapsed time, and status."
                        >
                            <div className="flex gap-[16px]">
                                <RunStatusPanel
                                    title="Agent run"
                                    status={
                                        runMutation.isPending
                                            ? "running"
                                            : runMutation.isError
                                              ? "failed"
                                              : selectedRun?.status ?? "queued"
                                    }
                                    runId={selectedRun?.id}
                                    stage={
                                        runMutation.isPending
                                            ? "Calling agent (retrieve → generate)…"
                                            : selectedRun
                                              ? `Last run ${selectedRun.status}`
                                              : userMessage.trim()
                                                ? "Idle — ready to run"
                                                : "Idle — enter a task on Configure"
                                    }
                                    startedAt={selectedRun?.created_at}
                                    completedAt={selectedRun?.completed_at}
                                    latencyMs={
                                        runMutation.isPending
                                            ? elapsedMs
                                            : selectedRun
                                              ? agentRunElapsedMs(selectedRun)
                                              : null
                                    }
                                    errorMessage={
                                        runMutation.isError
                                            ? getQueryErrorMessage(
                                                  runMutation.error,
                                                  "Agent run failed."
                                              )
                                            : selectedRun?.error_message
                                    }
                                    onRetry={
                                        userMessage.trim()
                                            ? () => runMutation.mutate()
                                            : undefined
                                    }
                                    retryLabel="Run agent"
                                    retryDisabled={runMutation.isPending || !userMessage.trim()}
                                />

                                <KeyValueList
                                    dense
                                    items={[
                                        {
                                            key: "task",
                                            label: "Current task",
                                            value: userMessage.trim()
                                                ? userMessage.trim().slice(0, 160) +
                                                  (userMessage.trim().length > 160 ? "…" : "")
                                                : "—",
                                        },
                                    ]}
                                />

                                <div className="flex flex-col sm:flex-row gap-[8px]">
                                    <DisabledWithReason
                                        reason={agentRunDisabledReason({
                                            message: userMessage,
                                            pending: runMutation.isPending,
                                        })}
                                    >
                                        <Button
                                            variant="default"
                                            disabled={
                                                runMutation.isPending || !userMessage.trim()
                                            }
                                            onClick={() => runMutation.mutate()}
                                            type="button"
                                        ><RunIcon />
                                            {runMutation.isPending ? "Running…" : "Run agent"}
                                        </Button>
                                    </DisabledWithReason>
                                    <Button variant="ghost" onClick={() => setTab("configure")} type="button">
                                        Edit configuration
                                    </Button>
                                </div>
                            </div>
                        </SectionCard>

                        <SectionCard
                            title="Run history"
                            description="Persisted runs for your account. Select one to inspect Trace, Sources, and Output."
                        >
                            <div className="flex gap-[12px]">
                                <Button
                                    variant="ghost"
                                    onClick={() => void runsQuery.refetch()}
                                    disabled={runsQuery.isFetching}
                                    type="button">
                                    {runsQuery.isFetching ? "Refreshing…" : "Refresh history"}
                                </Button>
                                <QueryBoundary
                                    isLoading={runsQuery.isLoading}
                                    isError={runsQuery.isError}
                                    error={runsQuery.error}
                                    onRetry={() => void runsQuery.refetch()}
                                >
                                    {history.length === 0 ? (
                                        <EmptyState
                                            icon={<AgentIcon />}
                                            title="No agent runs yet"
                                            description="Submit a run to inspect response, citations, cost, and degradation."
                                        />
                                    ) : (
                                        <div style={{ overflowX: "auto" }}>
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-border">
                                                        <td className="p-2 align-top">Run</td>
                                                        <td className="p-2 align-top">Status</td>
                                                        <td className="p-2 align-top">Model</td>
                                                        <td className="p-2 align-top">Duration</td>
                                                        <td className="p-2 align-top">When</td>
                                                        <td align="right" className="p-2 align-top">Open</td>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {history.map((run) => (
                                                        <tr key={run.id} className="border-b border-border">
                                                            <td className="p-2 align-top">
                                                                {run.id.slice(0, 8)}…
                                                                {run.agent_id
                                                                    ? ` · ${run.agent_id}`
                                                                    : ""}
                                                            </td>
                                                            <td className="p-2 align-top">
                                                                <RunStatusChip status={run.status} />
                                                            </td>
                                                            <td className="p-2 align-top">
                                                                {run.provider_key}/
                                                                {run.model_name}
                                                            </td>
                                                            <td className="p-2 align-top">
                                                                {run.latency_ms != null
                                                                    ? formatElapsed(run.latency_ms)
                                                                    : "—"}
                                                            </td>
                                                            <td className="p-2 align-top">
                                                                {new Date(
                                                                    run.created_at
                                                                ).toLocaleString()}
                                                            </td>
                                                            <td align="right" className="p-2 align-top">
                                                                <Button
                                                                    variant={
                                                                        selectedRunId === run.id
                                                                            ? "default"
                                                                            : "outline"
                                                                    }
                                                                    onClick={() => {
                                                                        setSelectedRunId(run.id);
                                                                        setTab("output");
                                                                    }}
                                                                    type="button">
                                                                    {`${run.id.slice(0, 8)}… · ${run.status}`}
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </QueryBoundary>
                            </div>
                        </SectionCard>
                    </>
                ) : null}

                {tab === "trace" || tab === "sources" || tab === "output" ? (
                    !selectedRunId ? (
                        <SectionCard
                            title={
                                tab === "trace" ? "Trace" : tab === "sources" ? "Sources" : "Output"
                            }
                            description="Select or create a run first."
                        >
                            <EmptyState
                                icon={<AgentIcon />}
                                title="No run selected"
                                description="Run an agent or pick a history item on the Run tab."
                                action={
                                    <Button variant="default" onClick={() => setTab("run")} type="button">
                                        Open Run
                                    </Button>
                                }
                            />
                        </SectionCard>
                    ) : (
                        <QueryBoundary
                            isLoading={selectedRunQuery.isLoading}
                            isError={selectedRunQuery.isError}
                            error={selectedRunQuery.error}
                            onRetry={() => void selectedRunQuery.refetch()}
                        >
                            {selectedRun && tab === "trace" ? (
                                <SectionCard
                                    title="Trace"
                                    description="Structured steps (plan, tool calls, results, errors) — not a raw log dump."
                                >
                                    <div className="flex gap-[12px]">
                                        <div className="flex flex-row gap-[8px] flex-wrap">
                                            <div
                                                className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />
                                            <RunStatusChip status={selectedRun.status} />
                                            <HelpTooltip termId="agent_trace" />
                                        </div>

                                        {(selectedRun.retrieval_degraded ||
                                            selectedRun.memory_degraded ||
                                            selectedRun.error_message) && (
                                            <div role="alert" className="rounded-lg border border-border p-3 text-sm">
                                                {selectedRun.error_message ??
                                                    selectedRun.degradation_reason ??
                                                    (selectedRun.retrieval_degraded
                                                        ? "Retrieval degraded"
                                                        : "Memory degraded")}
                                            </div>
                                        )}

                                        <div className="flex gap-[8px]">
                                            {traceSteps.map((step) => (
                                                <div
                                                    key={step.id}
                                                    style={{
                                                        padding: 12,
                                                        borderRadius: 4,
                                                        backgroundColor: "action.hover",
                                                        borderLeft: 3,
                                                        borderColor:
                                                            step.status === "error"
                                                                ? "error.main"
                                                                : step.status === "warn"
                                                                  ? "warning.main"
                                                                  : "primary.main",
                                                    }}
                                                >
                                                    <div className="flex flex-col sm:flex-row gap-[8px] justify-between">
                                                        <p>
                                                            {step.title}
                                                        </p>
                                                        <div className="flex flex-row gap-[6px] items-center">
                                                            <div
                                                                className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />
                                                            {step.durationMs != null ? (
                                                                <span className="text-muted-foreground">
                                                                    {formatElapsed(step.durationMs)}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                    {step.detail ? (
                                                        <p
                                                            style={{ marginTop: 4, whiteSpace: "pre-wrap" }}
                                                            className="text-muted-foreground">
                                                            {step.detail}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            ))}
                                        </div>

                                        <p className="text-muted-foreground">
                                            Tokens: {selectedRun.total_tokens} (in{" "}
                                            {selectedRun.input_tokens} / out{" "}
                                            {selectedRun.output_tokens}) · Est. cost:{" "}
                                            {formatAgentCostMicros(
                                                selectedRun.estimated_cost_micros
                                            )}
                                        </p>

                                        <AdvancedSettings title="Raw run identifiers">
                                            <KeyValueList
                                                items={[
                                                    {
                                                        key: "memory_run_id",
                                                        label: "Memory run",
                                                        value: selectedRun.memory_run_id,
                                                    },
                                                    {
                                                        key: "provider",
                                                        label: "Provider / model",
                                                        value: `${selectedRun.provider_key}/${selectedRun.model_name}`,
                                                    },
                                                ]}
                                            />
                                        </AdvancedSettings>
                                    </div>
                                </SectionCard>
                            ) : null}

                            {selectedRun && tab === "sources" ? (
                                <SectionCard
                                    title="Sources"
                                    description="Citations and retrieved evidence attached to this run."
                                >
                                    <div className="flex gap-[12px]">
                                        {selectedRun.retrieval_query ? (
                                            <p className="text-muted-foreground">
                                                Retrieval query: {selectedRun.retrieval_query}
                                            </p>
                                        ) : null}

                                        {selectedRun.retrieved_chunk_ids.length === 0 ? (
                                            <p className="text-muted-foreground">
                                                No retrieved evidence for this run.
                                            </p>
                                        ) : (
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-border">
                                                        <td className="p-2 align-top">#</td>
                                                        <td className="p-2 align-top">Chunk ID</td>
                                                        <td className="p-2 align-top">Role</td>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedRun.retrieved_chunk_ids.map(
                                                        (chunkId, index) => (
                                                            <tr key={chunkId} className="border-b border-border">
                                                                <td className="p-2 align-top">{index + 1}</td>
                                                                <td
                                                                    style={{
                                                                        fontFamily: "monospace",
                                                                        fontSize: 12,
                                                                    }}
                                                                    className="p-2 align-top">
                                                                    {chunkId}
                                                                </td>
                                                                <td className="p-2 align-top">
                                                                    Retrieved evidence
                                                                </td>
                                                            </tr>
                                                        )
                                                    )}
                                                </tbody>
                                            </table>
                                        )}

                                        {selectedRun.injection_chunks_filtered > 0 ? (
                                            <div role="alert" className="rounded-lg border border-border p-3 text-sm">
                                                Filtered {selectedRun.injection_chunks_filtered}{" "}
                                                injection chunk(s) before generation.
                                            </div>
                                        ) : null}

                                        {(selectedRun.retrieval_degraded ||
                                            selectedRun.memory_degraded) && (
                                            <div role="alert" className="rounded-lg border border-border p-3 text-sm">
                                                {selectedRun.degradation_reason ??
                                                    (selectedRun.retrieval_degraded
                                                        ? "Retrieval degraded — treat sources cautiously."
                                                        : "Memory degraded.")}
                                            </div>
                                        )}
                                    </div>
                                </SectionCard>
                            ) : null}

                            {selectedRun && tab === "output" ? (
                                <SectionCard
                                    title="Output"
                                    description="Final generated artifact — separate from Trace."
                                >
                                    <div className="flex gap-[12px]">
                                        <div className="flex flex-row gap-[8px] flex-wrap">
                                            <RunStatusChip status={selectedRun.status} />
                                            <div
                                                className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />
                                            <Button variant="ghost" onClick={() => setTab("trace")} type="button">
                                                View trace
                                            </Button>
                                            <Button variant="ghost" onClick={() => setTab("sources")} type="button">
                                                View sources
                                            </Button>
                                        </div>

                                        <p style={{ whiteSpace: "pre-wrap" }}>
                                            {selectedRun.output_text?.trim()
                                                ? selectedRun.output_text
                                                : selectedRun.output_json
                                                  ? "Structured JSON output (see Raw below)."
                                                  : "—"}
                                        </p>

                                        {selectedRun.output_json ? (
                                            <div className="flex gap-[8px]">
                                                {recordToKeyValueItems(selectedRun.output_json)
                                                    .length ? (
                                                    <KeyValueList
                                                        dense
                                                        items={recordToKeyValueItems(
                                                            selectedRun.output_json
                                                        )}
                                                    />
                                                ) : null}
                                                <AdvancedSettings title="Raw JSON artifact">
                                                    <JsonBlock data={selectedRun.output_json} />
                                                </AdvancedSettings>
                                            </div>
                                        ) : null}
                                    </div>
                                </SectionCard>
                            ) : null}
                        </QueryBoundary>
                    )
                ) : null}
            </div>
        </PageShell>
    );
}
