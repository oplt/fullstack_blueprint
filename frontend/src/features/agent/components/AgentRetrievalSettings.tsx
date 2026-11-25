import { FormField } from "@/components/ui/form-field";
import { HelpFieldLabel } from "../../../components/ui/HelpTooltip";
import { QueryBoundary } from "../../../components/ui/QueryBoundary";
import type { useAgentWorkspace } from "../hooks/useAgentWorkspace";

type AgentWorkspace = ReturnType<typeof useAgentWorkspace>;
type Props = {
    topK: number;
    setTopK: (value: number) => void;
    retrievalQuery: string;
    setRetrievalQuery: (value: string) => void;
    documentsQuery: AgentWorkspace["documentsQuery"];
    selectedDocumentIds: string[];
    toggleDocument: (id: string) => void;
};

export function AgentRetrievalSettings({
    topK,
    setTopK,
    retrievalQuery,
    setRetrievalQuery,
    documentsQuery,
    selectedDocumentIds,
    toggleDocument,
}: Props) {
    return (
        <section className="grid gap-3">
            <h3>Limits & retrieval</h3>
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
                <FormField
                    type="number"
                    label={<HelpFieldLabel termId="top_k_retrieval">Top-k</HelpFieldLabel>}
                    value={topK}
                    onChange={(event) => setTopK(Number(event.target.value) || 4)}
                    min={1}
                    max={20}
                />
                <FormField
                    label="Retrieval query (optional)"
                    value={retrievalQuery}
                    onChange={(event) => setRetrievalQuery(event.target.value)}
                    description="Defaults to the user message when empty."
                />
            </div>
            <div>
                <p>RAG documents (optional scope)</p>
                <QueryBoundary
                    isLoading={documentsQuery.isLoading}
                    isError={documentsQuery.isError}
                    error={documentsQuery.error}
                    onRetry={() => void documentsQuery.refetch()}
                >
                    {(documentsQuery.data?.items ?? []).length === 0 ? (
                        <p className="text-muted-foreground">No RAG documents for this filter.</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {(documentsQuery.data?.items ?? []).map((document) => {
                                const selected = selectedDocumentIds.includes(document.id);
                                return (
                                    <button
                                        key={document.id}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() => toggleDocument(document.id)}
                                        className="rounded-full border border-border px-2 py-0.5 text-xs"
                                    >
                                        {document.original_filename || document.filename}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </QueryBoundary>
            </div>
        </section>
    );
}
