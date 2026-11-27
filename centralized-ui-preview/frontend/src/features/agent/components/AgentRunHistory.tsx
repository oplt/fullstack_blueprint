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
                            <div className="flex gap-ui-sm">
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
                                            <table className="w-full ui-auto-agent-run-history-table">
                                                <thead>
                                                    <tr className="ui-auto-agent-run-history-tr">
                                                        <td className="ui-auto-agent-run-history-td">Run</td>
                                                        <td className="ui-auto-agent-run-history-td-a2ee7af">Status</td>
                                                        <td className="ui-auto-agent-run-history-td-a2ee7af-x">Model</td>
                                                        <td className="ui-auto-agent-run-history-td-a2ee7af-x-x">Duration</td>
                                                        <td className="ui-auto-agent-run-history-td-a2ee7af-x-x-x">When</td>
                                                        <td align="right" className="ui-auto-agent-run-history-td-a2ee7af-x-x-x-x">Open</td>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {history.map((run) => (
                                                        <tr key={run.id} className="ui-auto-agent-run-history-tr-6ff2f8b">
                                                            <td className="ui-auto-agent-run-history-td-a2ee7af-x-x-x-x-x">
                                                                {run.id.slice(0, 8)}…
                                                                {run.agent_id
                                                                    ? ` · ${run.agent_id}`
                                                                    : ""}
                                                            </td>
                                                            <td className="ui-auto-agent-run-history-td-a2ee7af-x-x-x-x-x-x">
                                                                <RunStatusBadge status={run.status} />
                                                            </td>
                                                            <td className="ui-auto-agent-run-history-td-a2ee7af-x-x-x-x-x-x-x">
                                                                {run.provider_key}/
                                                                {run.model_name}
                                                            </td>
                                                            <td className="ui-auto-agent-run-history-td-a2ee7af-x-x-x-x-x-x-x-x">
                                                                {run.latency_ms != null
                                                                    ? formatElapsed(run.latency_ms)
                                                                    : "—"}
                                                            </td>
                                                            <td className="ui-auto-agent-run-history-td-a2ee7af-x-x-x-x-x-x-x-x-x">
                                                                {new Date(
                                                                    run.created_at
                                                                ).toLocaleString()}
                                                            </td>
                                                            <td align="right" className="ui-auto-agent-run-history-td-a2ee7af-x-x-x-x-x-x-x-x-x-x">
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
