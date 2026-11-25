import { AdvancedSettings } from "../../../components/ui/AdvancedSettings";
import { HelpTooltip } from "../../../components/ui/HelpTooltip";
import { KeyValueList } from "../../../components/ui/KeyValueList";
import { RunStatusBadge } from "../../../components/ui/RunStatusBadge";
import { SectionCard } from "../../../components/ui/SectionCard";
import { formatAgentCostMicros } from "../../../api/agent";
import { formatElapsed } from "../agentTraceModel";
import { buildAgentTraceSteps } from "../agentTraceModel";
import type { useAgentWorkspace } from "../hooks/useAgentWorkspace";
type Workspace = ReturnType<typeof useAgentWorkspace>;
type AgentRun = NonNullable<Workspace["selectedRunQuery"]["data"]>;

type Props = { run: AgentRun; traceSteps: ReturnType<typeof buildAgentTraceSteps> };
export function AgentTraceDetails({ run: selectedRun, traceSteps }: Props) {
    return (
                            
                                <SectionCard
                                    title="Trace"
                                    description="Structured steps (plan, tool calls, results, errors) — not a raw log dump."
                                >
                                    <div className="flex gap-3">
                                        <div className="flex flex-row gap-2 flex-wrap">
                                            <div
                                                className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />
                                            <RunStatusBadge status={selectedRun.status} />
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

                                        <div className="flex gap-2">
                                            {traceSteps.map((step) => (
                                                <div
                                                    key={step.id}
                                                    className={`trace-step ${step.status === "error" ? "trace-step--error" : step.status === "warn" ? "trace-step--warning" : "trace-step--default"}`}
                                                >
                                                    <div className="flex flex-col sm:flex-row gap-2 justify-between">
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
