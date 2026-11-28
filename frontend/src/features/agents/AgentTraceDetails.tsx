import {AdvancedSettings} from "../../components/ui/AdvancedSettings";
import {HelpTooltip} from "../../components/ui/HelpTooltip";
import {KeyValueList} from "../../components/KeyValueList";
import {RunStatusBadge} from "../../components/RunStatus";
import {SectionCard} from "../../components/Section";
import {formatAgentCostMicros} from "@/features/agents/api";
import {formatElapsed} from "./agentTraceModel";
import {buildAgentTraceSteps} from "./agentTraceModel";
import type {useAgentWorkspace} from "./useAgentWorkspace";
import {Badge} from "@/components/ui/badge";

type Workspace = ReturnType<typeof useAgentWorkspace>;
type AgentRun = NonNullable<Workspace["selectedRunQuery"]["data"]>;

type Props = { run: AgentRun; traceSteps: ReturnType<typeof buildAgentTraceSteps> };

const TRACE_CATEGORY_LABELS = {
    plan: "Plan",
    tool: "Tool call",
    result: "Result",
    error: "Error",
    meta: "Meta",
} as const;

export function AgentTraceDetails({run: selectedRun, traceSteps}: Props) {
    return (

        <SectionCard
            title="Trace"
            description="Structured steps (plan, tool calls, results, errors) — not a raw log dump."
        >
            <div className="flex gap-ui-sm">
                <div className="flex flex-row gap-ui-xs flex-wrap">
                    <Badge variant="secondary">
                        run {selectedRun.id}
                    </Badge>
                    <RunStatusBadge status={selectedRun.status}/>
                    <HelpTooltip termId="agent_trace"/>
                </div>

                {(selectedRun.retrieval_degraded ||
                    selectedRun.memory_degraded ||
                    selectedRun.error_message) && (
                    <div role="alert" className="rounded-lg border border-border p-ui-sm text-body-md">
                        {selectedRun.error_message ??
                            selectedRun.degradation_reason ??
                            (selectedRun.retrieval_degraded
                                ? "Retrieval degraded"
                                : "Memory degraded")}
                    </div>
                )}

                <div className="flex gap-ui-xs">
                    {traceSteps.map((step) => (
                        <div
                            key={step.id}
                            className={`trace-step ${step.status === "error" ? "trace-step--error" : step.status === "warn" ? "trace-step--warning" : "trace-step--default"}`}
                        >
                            <div className="flex flex-col sm:flex-row gap-ui-xs justify-between">
                                <p>
                                    {step.title}
                                </p>
                                <div className="flex flex-row items-center gap-ui-xxs.5">
                                    <Badge variant="outline">
                                        {TRACE_CATEGORY_LABELS[step.category]}
                                    </Badge>
                                    {step.durationMs != null ? (
                                        <span className="text-muted-foreground">
                                                                    {formatElapsed(step.durationMs)}
                                                                </span>
                                    ) : null}
                                </div>
                            </div>
                            {step.detail ? (
                                <p

                                    className="mt-1 whitespace-pre-wrap text-muted-foreground">
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

    );
}
