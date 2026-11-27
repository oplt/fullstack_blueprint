import { Button } from "@/components/ui/button";import { FormField } from "@/components/ui/form-field";
import { FileText as DocumentIcon } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { SectionCard } from "../../../components/ui/SectionCard";
import { formatDateTime } from "../../../utils/formatters";
import type { AiStudioModel } from "../hooks/useAiStudioView";

export function RetrievalDocumentsPanel({ m }: { m: AiStudioModel }) {
    const { textDocumentForm, setTextDocumentForm, createTextDocumentMutation, uploadDocumentMutation, uploadDescription, setUploadDescription, documents } = m;
    return (
        <SectionCard title="Retrieval documents" description="Ingest source files or direct text, chunk them, and use them as retrieval context in prompt runs.">
            <div className="flex gap-4">
                <FormField
                    label="Document title"
                    value={textDocumentForm.title}
                    onChange={(event: any) => setTextDocumentForm((current) => ({ ...current, title: event.target.value }))} />
                <FormField
                    label="Description"
                    value={textDocumentForm.description}
                    onChange={(event: any) => setTextDocumentForm((current) => ({ ...current, description: event.target.value }))} />
                <FormField
                    label="Document content"
                    value={textDocumentForm.content}
                    onChange={(event: any) => setTextDocumentForm((current) => ({ ...current, content: event.target.value }))}
                    as="textarea"
                    rows={6} />
                <Button
                    variant="outline"
                    disabled={createTextDocumentMutation.isPending || !textDocumentForm.title.trim() || !textDocumentForm.content.trim()}
                    onClick={() => createTextDocumentMutation.mutate(textDocumentForm)}
                    type="button">
                    {createTextDocumentMutation.isPending ? "Ingesting..." : "Create text document"}
                </Button>
                <Button
                    variant="default"
                    disabled={uploadDocumentMutation.isPending}
                    render={<label />}
                    type="button">
                    {uploadDocumentMutation.isPending ? "Uploading..." : "Upload text/markdown/json file"}
                    <input
                        hidden
                        type="file"
                        accept=".txt,.md,.json,.ndjson,text/plain,text/markdown,application/json"
                        onChange={(event: any) => {
                            const file = event.target.files?.[0];
                            if (file) {
                                uploadDocumentMutation.mutate({ file, description: uploadDescription || undefined });
                            }
                            event.currentTarget.value = "";
                        }}
                    />
                </Button>
                <FormField
                    label="Upload description"
                    value={uploadDescription}
                    onChange={(event: any) => setUploadDescription(event.target.value)} />
                {documents.length > 0 ? (
                    <div className="flex gap-2">
                        {documents.map((document) => (
                            <div key={document.id} className="surface-card ui-feature-surface ui-feature-surface-dense">
                                <p>{document.title}</p>
                                <span className="text-muted-foreground">
                                    {document.chunk_count} chunks • {document.content_type} • {formatDateTime(document.updated_at)}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState icon={<DocumentIcon />} title="No documents indexed" description="Upload source material to power retrieval-augmented runs." />
                )}
            </div>
        </SectionCard>
    );
}
