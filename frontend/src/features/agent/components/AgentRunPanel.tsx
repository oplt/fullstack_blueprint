import type { useAgentWorkspace } from "../hooks/useAgentWorkspace";
import { AgentRunStatus } from "./AgentRunStatus";
import { AgentRunHistory } from "./AgentRunHistory";

type Workspace = ReturnType<typeof useAgentWorkspace>;
type Run = NonNullable<Workspace["selectedRunQuery"]["data"]>;
type Props = {
    active: boolean;
    history: NonNullable<Workspace["runsQuery"]["data"]>["items"];
    runsQuery: Workspace["runsQuery"];
    runMutation: Workspace["runMutation"];
    selectedRun: Run | null;
    selectedRunId: string | null;
    setSelectedRunId: (id: string | null) => void;
    setTab: (tab: "configure" | "run" | "trace" | "sources" | "output") => void;
    userMessage: string;
    elapsedMs: number;
};

export function AgentRunPanel(props: Props) {
    if (!props.active) return null;
    return (
        <>
            <AgentRunStatus
                runMutation={props.runMutation}
                selectedRun={props.selectedRun}
                userMessage={props.userMessage}
                elapsedMs={props.elapsedMs}
                setTab={props.setTab}
            />
            <AgentRunHistory
                history={props.history}
                runsQuery={props.runsQuery}
                selectedRunId={props.selectedRunId}
                setSelectedRunId={props.setSelectedRunId}
                setTab={props.setTab}
            />
        </>
    );
}
