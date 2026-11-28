import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { HelpFieldLabel } from "../../components/ui/HelpTooltip";
import { QueryBoundary } from "../../components/ui/QueryBoundary";
import type { useAgentWorkspace } from "./useAgentWorkspace";

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
        <section className="grid gap-ui-sm">
            <h3>Limits & retrieval</h3>
            <div className="flex flex-col gap-ui-md sm:flex-row sm:flex-wrap">
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
                        <div className="flex flex-wrap gap-ui-xs">
                            {(documentsQuery.data?.items ?? []).map((document) => {
                                const selected = selectedDocumentIds.includes(document.id);
                                return (
                                    <Button
                                        key={document.id}
                                        type="button"
                                        variant="category"
                                        size="category"
                                        aria-pressed={selected}
                                        onClick={() => toggleDocument(document.id)}
                                        className="h-auto min-h-8 px-ui-xs py-1 text-body-sm"
                                    >
                                        {document.original_filename || document.filename}
                                    </Button>
                                );
                            })}
                        </div>
                    )}
                </QueryBoundary>
            </div>
        </section>
    );
}
