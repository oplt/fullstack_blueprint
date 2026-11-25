import { Button } from "@/components/ui/button";
import { Bot as AgentIcon } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { QueryBoundary } from "../../../components/ui/QueryBoundary";
import { RunStatusBadge } from "../../../components/ui/RunStatusBadge";
import { SectionCard } from "../../../components/ui/SectionCard";
import { formatElapsed } from "../agentTraceModel";
import type { useAgentWorkspace } from "../hooks/useAgentWorkspace";
type Workspace = ReturnType<typeof useAgentWorkspace>;

type Props = { history: NonNullable<Workspace["runsQuery"]["data"]>["items"]; runsQuery: Workspace["runsQuery"]; selectedRunId: string | null; setSelectedRunId: (id: string | null) => void; setTab: (tab: "configure" | "run" | "trace" | "sources" | "output") => void };

export function AgentRunHistory({ history, runsQuery, selectedRunId, setSelectedRunId, setTab }: Props) {
    return (
                        <SectionCard
                            title="Run history"
                            description="Persisted runs for your account. Select one to inspect Trace, Sources, and Output."
                        >
                            <div className="flex gap-3">
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
                                        <div className="min-w-0 max-w-full overflow-x-auto">
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
                                                                <RunStatusBadge status={run.status} />
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
    );
}
