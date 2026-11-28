import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { HelpTooltip } from "../../components/ui/HelpTooltip";
import { KeyValueList } from "../../components/ui/KeyValueList";
import { MetricGrid } from "../../components/ui/MetricGrid";
import { RagIngestionStatus } from "./RagIngestionStatus";
import { SectionCard } from "../../components/ui/SectionCard";
import { documentPipelineLabel } from "./ragEvaluationSummary";
import { RagMetricTile as MetricTile } from "./RagMetricTile";
import type { useRagWorkspace } from "./useRagWorkspace";
type Workspace = ReturnType<typeof useRagWorkspace>;
type Document = NonNullable<Workspace["selectedDocument"]>;
type Props = { workspace: Workspace; document: Document };

export function RagIndexingConfiguration({ workspace, document }: Props) {
    const selectedDocument = document;
    return (
                                <SectionCard
                                    title="Indexing configuration"
                                    description={`Settings observed for ${
                                        selectedDocument.original_filename ||
                                        selectedDocument.filename
                                    }`}
                                    action={
                                        <Button
                                            disabled={workspace.indexMutation.isPending}
                                            onClick={() =>
                                                workspace.indexMutation.mutate(selectedDocument.id)
                                            }
                                            type="button"><RefreshCw />Re-index
                                                                                    </Button>
                                    }
                                >
                                    <div className="flex gap-ui-md">
                                        <MetricGrid columns={4}>
                                            <MetricTile
                                                label="Document status"
                                                value={selectedDocument.status}
                                                helpTermId="indexing_state"
                                            />
                                            <MetricTile
                                                label="Chunks"
                                                value={workspace.chunksQuery.data?.total ?? "—"}
                                                helpTermId="chunk_size"
                                                description="Indexed segments"
                                            />
                                            <MetricTile
                                                label="Parsing"
                                                value={
                                                    documentPipelineLabel(selectedDocument.status)
                                                        .parsing
                                                }
                                                helpTermId="parsing_state"
                                            />
                                            <MetricTile
                                                label="Job"
                                                value={workspace.jobQuery.data?.status ?? "idle"}
                                                description={
                                                    workspace.pollJobId ? "Live ingestion poll" : "No active job"
                                                }
                                            />
                                        </MetricGrid>

                                        {workspace.pollJobId && workspace.jobQuery.data ? (
                                            <RagIngestionStatus
                                                title="Indexing progress"
                                                job={workspace.jobQuery.data}
                                                onRetry={() =>
                                                    workspace.indexMutation.mutate(selectedDocument.id)
                                                }
                                                retryDisabled={workspace.indexMutation.isPending}
                                            />
                                        ) : null}

                                        {workspace.indexingParams.length ? (
                                            <KeyValueList
                                                showHelp
                                                items={workspace.indexingParams.map((row) => ({
                                                    key: row.key,
                                                    label: row.label,
                                                    value: row.value,
                                                    helpTermId: row.helpTermId,
                                                }))}
                                            />
                                        ) : (
                                            <div role="alert" className="rounded-lg border border-border p-ui-sm text-body-md">
                                                Embedding model,{" "}
                                                <HelpTooltip termId="chunk_size" variant="label">
                                                    chunk size
                                                </HelpTooltip>
                                                , and{" "}
                                                <HelpTooltip termId="chunk_overlap" variant="label">
                                                    overlap
                                                </HelpTooltip>{" "}
                                                appear here once chunks are available (from chunk
                                                provenance metadata).
                                            </div>
                                        )}
                                    </div>
                                </SectionCard>
    );
}
