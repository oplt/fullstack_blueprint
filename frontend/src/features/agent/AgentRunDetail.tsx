import { formatAgentCostMicros, type AgentRun } from "../../api/agent";
import { AdvancedSettings } from "../../components/ui/AdvancedSettings";
import { JsonBlock } from "../../components/ui/JsonBlock";
import { KeyValueList } from "../../components/ui/KeyValueList";
import { SectionCard } from "../../components/ui/SectionCard";
import { recordToKeyValueItems } from "../../components/ui/jsonDisplay";
import { buildAgentTraceSteps, formatElapsed } from "./agentTraceModel";

type AgentRunDetailProps = {
    run: AgentRun;
};

/** Compact run summary used outside the tabbed Agent workspace. */
export function AgentRunDetail({ run }: AgentRunDetailProps) {
    const steps = buildAgentTraceSteps(run).slice(0, 4);
    const outputItems = recordToKeyValueItems(run.output_json);
    return (
        <SectionCard
            title="Run detail"
            description="Structured summary — prefer the Agent Trace / Sources / Output tabs for full inspection."
        >
            <div className="flex gap-[12px]">
                <div className="flex flex-row gap-[8px] flex-wrap">
                    <div
                        className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />
                    <div
                        className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />
                    <div
                        className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />
                </div>

                {(run.retrieval_degraded || run.memory_degraded || run.error_message) && (
                    <div role="alert" className="rounded-lg border border-border p-3 text-sm">
                        {run.error_message ??
                            run.degradation_reason ??
                            (run.retrieval_degraded
                                ? "Retrieval degraded"
                                : "Memory degraded")}
                    </div>
                )}

                <div>
                    <p>
                        Trace preview
                    </p>
                    {steps.map((step) => (
                        <p key={step.id} className="text-muted-foreground">
                            {step.title}
                            {step.durationMs != null ? ` · ${formatElapsed(step.durationMs)}` : ""}
                        </p>
                    ))}
                </div>

                <div>
                    <p>
                        Output
                    </p>
                    {run.output_text?.trim() ? (
                        <p style={{ whiteSpace: "pre-wrap" }}>
                            {run.output_text}
                        </p>
                    ) : outputItems.length ? (
                        <KeyValueList dense items={outputItems} />
                    ) : (
                        <p className="text-muted-foreground">
                            —
                        </p>
                    )}
                    {run.output_json ? (
                        <AdvancedSettings title="Raw JSON" sx={{ marginTop: 1 }}>
                            <JsonBlock data={run.output_json} />
                        </AdvancedSettings>
                    ) : null}
                </div>

                <p className="text-muted-foreground">
                    Latency: {run.latency_ms ?? "—"} ms · Tokens: {run.total_tokens} · Est. cost:{" "}
                    {formatAgentCostMicros(run.estimated_cost_micros)}
                </p>
            </div>
        </SectionCard>
    );
}
