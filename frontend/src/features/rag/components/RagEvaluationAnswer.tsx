import { RagCitationList } from "./RagCitationList";
import { RagDegradedNotice } from "./RagDegradedNotice";
import { MetricGrid } from "../../../components/ui/MetricGrid";
import { RagMetricTile as MetricTile } from "./RagMetricTile";
import { formatCoverage } from "../ragEvaluationSummary";
import type { useRagWorkspace } from "../hooks/useRagWorkspace";

type Props = { workspace: ReturnType<typeof useRagWorkspace> };

export function RagEvaluationAnswer({ workspace }: Props) {
    if (!workspace.askResult || !workspace.askEval) return null;
    return (
                            
                                <div className="flex gap-3">
                                    <MetricGrid columns={4}>
                                        <MetricTile
                                            label="Retrieved chunks"
                                            value={workspace.askEval.retrievedCount}
                                            helpTermId="top_k_retrieval"
                                        />
                                        <MetricTile
                                            label="Citations"
                                            value={workspace.askEval.citationCount}
                                            helpTermId="grounding"
                                        />
                                        <MetricTile
                                            label="Citation coverage"
                                            value={formatCoverage(workspace.askEval.citationCoverage)}
                                            helpTermId="citation_coverage"
                                            description="Cited ÷ retrieved"
                                        />
                                        <MetricTile
                                            label="Documents cited"
                                            value={workspace.askEval.distinctDocuments}
                                            description={
                                                workspace.askEval.meanCitationScore != null
                                                    ? `Mean score ${workspace.askEval.meanCitationScore.toFixed(3)}`
                                                    : undefined
                                            }
                                        />
                                    </MetricGrid>

                                    {workspace.askEval.groundingNotes.map((note) => (
                                        <div
                                            key={note}
                                            role="alert"
                                            className="rounded-lg border border-border p-3 text-sm">
                                            {note}
                                        </div>
                                    ))}

                                    <RagDegradedNotice result={workspace.askResult} />

                                    <p>Answer</p>
                                    <p>{workspace.askResult.answer}</p>
                                    <span className="text-muted-foreground">
                                        {workspace.askResult.model_name} · {workspace.askResult.latency_ms} ms
                                    </span>

                                    <RagCitationList result={workspace.askResult} />
                                </div>
                            
    );
}
