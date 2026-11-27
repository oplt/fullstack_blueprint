import { Button } from "@/components/ui/button";
import { Play as RunIcon } from "lucide-react";
import { DisabledWithReason } from "../../../components/ui/DisabledWithReason";
import { KeyValueList } from "../../../components/ui/KeyValueList";
import { RunStatusPanel } from "../../../components/ui/RunStatusPanel";
import { SectionCard } from "../../../components/ui/SectionCard";
import { getQueryErrorMessage } from "../../../utils/queryErrors";
import { agentRunElapsedMs } from "../agentTraceModel";
import type { useAgentWorkspace } from "../hooks/useAgentWorkspace";
type Workspace = ReturnType<typeof useAgentWorkspace>;
type Run = NonNullable<Workspace["selectedRunQuery"]["data"]>;

type Props = { runMutation: Workspace["runMutation"]; selectedRun: Run | null; userMessage: string; elapsedMs: number; setTab: (tab: "configure" | "run" | "trace" | "sources" | "output") => void };

function agentRunDisabledReason(message: string, pending: boolean): string | null {
    if (pending) return "An agent run is already in progress.";
    return message ? null : "Enter a task message before running the agent.";
}

function statusOf(mutation: Props["runMutation"], run: Run | null) {
    if (mutation.isPending) return "running";
    if (mutation.isError) return "failed";
    return run?.status ?? "queued";
}

function stageOf(mutation: Props["runMutation"], run: Run | null, message: string) {
    if (mutation.isPending) return "Calling agent (retrieve → generate)…";
    if (run) return `Last run ${run.status}`;
    return message.trim() ? "Idle — ready to run" : "Idle — enter a task on Configure";
}

function elapsedOf(mutation: Props["runMutation"], run: Run | null, elapsedMs: number) {
    if (mutation.isPending) return elapsedMs;
    return run ? agentRunElapsedMs(run) : null;
}

function errorOf(mutation: Props["runMutation"], run: Run | null) {
    return mutation.isError
        ? getQueryErrorMessage(mutation.error, "Agent run failed.")
        : run?.error_message;
}

function retryOf(mutation: Props["runMutation"], message: string) {
    return message ? () => mutation.mutate() : undefined;
}

function taskValue(message: string) {
    if (!message) return "—";
    return message.length > 160 ? `${message.slice(0, 160)}…` : message;
}

export function AgentRunStatus({ runMutation, selectedRun, userMessage, elapsedMs, setTab }: Props) {
    const message = userMessage.trim();
    const pending = runMutation.isPending;
    return (
                        <SectionCard
                            title="Run"
                            description="Current task, step, progress, elapsed time, and status."
                        >
                            <div className="flex gap-ui-md">
                                <RunStatusPanel
                                    title="Agent run"
                                    status={statusOf(runMutation, selectedRun)}
                                    runId={selectedRun?.id}
                                    stage={stageOf(runMutation, selectedRun, userMessage)}
                                    startedAt={selectedRun?.created_at}
                                    completedAt={selectedRun?.completed_at}
                                    latencyMs={elapsedOf(runMutation, selectedRun, elapsedMs)}
                                    errorMessage={errorOf(runMutation, selectedRun)}
                                    onRetry={retryOf(runMutation, message)}
                                    retryLabel="Run agent"
                                    retryDisabled={pending || !message}
                                />

                                <KeyValueList
                                    dense
                                    items={[
                                        {
                                            key: "task",
                                            label: "Current task",
                                            value: taskValue(message),
                                        },
                                    ]}
                                />

                                <div className="flex flex-col sm:flex-row gap-ui-xs">
                                    <DisabledWithReason
                                        reason={agentRunDisabledReason(message, pending)}
                                    >
                                        <Button
                                            variant="default"
                                            disabled={
                                                pending || !message
                                            }
                                            onClick={() => runMutation.mutate()}
                                            type="button"
                                        ><RunIcon />
                                            {pending ? "Running…" : "Run agent"}
                                        </Button>
                                    </DisabledWithReason>
                                    <Button variant="ghost" onClick={() => setTab("configure")} type="button">
                                        Edit configuration
                                    </Button>
                                </div>
                            </div>
                        </SectionCard>
    );
}
