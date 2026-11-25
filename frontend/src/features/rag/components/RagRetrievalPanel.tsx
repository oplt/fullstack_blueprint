import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import {
    Search as RetrieveIcon,
} from "lucide-react";
import { HelpFieldLabel, HelpTooltip } from "../../../components/ui/HelpTooltip";
import { SectionCard } from "../../../components/ui/SectionCard";
import type { useRagWorkspace } from "../hooks/useRagWorkspace";

type RagWorkspace = ReturnType<typeof useRagWorkspace>;
type Props = { workspace: RagWorkspace };

export function RagRetrievalPanel({ workspace }: Props) {
    return (
                
                    <SectionCard
                        title="Retrieval"
                        description="Run a retrieve-only query and inspect ranked chunks with similarity scores and sources."
                    >
                        <div className="flex gap-3">
                            <div className="flex flex-col sm:flex-row gap-4 sm:items-start">
                                <FormField
                                    label="Query"
                                    value={workspace.retrieveQuery}
                                    onChange={(e: any) => workspace.setRetrieveQuery(e.target.value)} />
                                <FormField
                                    type="number"
                                    label={
                                        <HelpFieldLabel termId="top_k_retrieval">
                                            Top-k
                                        </HelpFieldLabel>
                                    }
                                    value={workspace.topK}
                                    onChange={(e: any) =>
                                        workspace.setTopK(Math.max(1, Math.min(50, Number(e.target.value) || 1)))
                                    }
                                    min={1} max={50} step={1} />
                            </div>
                            {workspace.selectedDocumentId ? (
                                <span className="text-muted-foreground">
                                    Scoped to selected document. Clear selection on Documents to
                                    search the full project scope.
                                </span>
                            ) : null}
                            <Button
                                variant="default"
                                disabled={!workspace.retrieveQuery.trim() || workspace.retrieveMutation.isPending}
                                onClick={() => workspace.retrieveMutation.mutate()}
                                type="button"><RetrieveIcon />Retrieve
                                                            </Button>
                            {workspace.retrieveResult ? (
                                <div className="flex gap-2">
                                    {workspace.retrieveResult.degraded || workspace.retrieveResult.no_matches ? (
                                        <div role="alert" className="rounded-lg border border-border p-3 text-sm">
                                            {workspace.retrieveResult.degraded
                                                ? `Degraded: ${
                                                      workspace.retrieveResult.degradation_reason ?? "unknown"
                                                  }`
                                                : "No matches"}
                                            {workspace.retrieveResult.injection_chunks_filtered
                                                ? ` · filtered ${workspace.retrieveResult.injection_chunks_filtered} injection chunk(s)`
                                                : ""}
                                        </div>
                                    ) : null}
                                    <p>
                                        Retrieved chunks ({workspace.retrieveResult.chunks.length})
                                    </p>
                                    <div className="min-w-0 max-w-full overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-border">
                                                    <td className="p-2 align-top">Rank</td>
                                                    <td className="p-2 align-top">Document source</td>
                                                    <td className="p-2 align-top">Page</td>
                                                    <td className="p-2 align-top">
                                                        <HelpTooltip
                                                            termId="similarity_threshold"
                                                            variant="label"
                                                        >
                                                            Similarity
                                                        </HelpTooltip>
                                                    </td>
                                                    <td className="p-2 align-top">Chunk</td>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {workspace.retrieveResult.chunks.map((chunk, index) => (
                                                    <tr key={chunk.chunk_id} className="border-b border-border">
                                                        <td className="p-2 align-top">{index + 1}</td>
                                                        <td className="p-2 align-top">{chunk.filename}</td>
                                                        <td className="p-2 align-top">
                                                            {chunk.page_number ?? "—"}
                                                        </td>
                                                        <td className="p-2 align-top">
                                                            {chunk.score.toFixed(3)}
                                                        </td>
                                                        <td style={{ maxWidth: 420 }} className="p-2 align-top">
                                                            <p>
                                                                {chunk.content.slice(0, 280)}
                                                                {chunk.content.length > 280
                                                                    ? "…"
                                                                    : ""}
                                                            </p>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </SectionCard>
                
    );
}
