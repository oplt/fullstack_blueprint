import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";
import { EmptyState } from "../../components/ui/EmptyState";
import { QueryBoundary } from "../../components/ui/QueryBoundary";
import { SectionCard } from "../../components/ui/SectionCard";
import type { useAgentWorkspace } from "./useAgentWorkspace";
import { AgentTraceDetails } from "./AgentTraceDetails";
import { AgentSourcesDetails } from "./AgentSourcesDetails";
import { AgentOutputDetails } from "./AgentOutputDetails";
import { buildAgentTraceSteps } from "./agentTraceModel";

type Workspace = ReturnType<typeof useAgentWorkspace>;
type AgentRun = NonNullable<Workspace["selectedRunQuery"]["data"]>;
type Props = {
    tab: "configure" | "run" | "trace" | "sources" | "output";
    selectedRunId: string | null;
    selectedRunQuery: Workspace["selectedRunQuery"];
    selectedRun: AgentRun | null;
    traceSteps: ReturnType<typeof buildAgentTraceSteps>;
    setTab: (tab: "configure" | "run" | "trace" | "sources" | "output") => void;
};

export function AgentRunDetails({ tab, selectedRunId, selectedRunQuery, selectedRun, traceSteps, setTab }: Props) {
    if (tab !== "trace" && tab !== "sources" && tab !== "output") return null;
    if (!selectedRunId) {
        const title = tab === "trace" ? "Trace" : tab === "sources" ? "Sources" : "Output";
        return (
            <SectionCard title={title} description="Select or create a run first.">
                <EmptyState
                    icon={<Bot />}
                    title="No run selected"
                    description="Run an agent or pick a history item on the Run tab."
                    action={<Button variant="default" onClick={() => setTab("run")} type="button">Open Run</Button>}
                />
            </SectionCard>
        );
    }
    return (
        <QueryBoundary
            isLoading={selectedRunQuery.isLoading}
            isError={selectedRunQuery.isError}
            error={selectedRunQuery.error}
            onRetry={() => void selectedRunQuery.refetch()}
        >
            {selectedRun ? (
                tab === "trace" ? <AgentTraceDetails run={selectedRun} traceSteps={traceSteps} />
                    : tab === "sources" ? <AgentSourcesDetails run={selectedRun} />
                        : <AgentOutputDetails run={selectedRun} setTab={setTab} />
            ) : null}
        </QueryBoundary>
    );
}
