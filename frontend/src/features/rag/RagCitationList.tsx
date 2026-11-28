import { HelpTooltip } from "../../components/ui/HelpTooltip";
import type { useRagWorkspace } from "./useRagWorkspace";

type AskResult = NonNullable<ReturnType<typeof useRagWorkspace>["askResult"]>;

export function CitationPreview({ citation }: { citation: RagCitation }) {
    const source = useMutation({ mutationFn: () => getRagCitationSource(citation), gcTime: 0 });
    const preview = source.data;
    const excerptStart = preview?.content.indexOf(citation.snippet) ?? -1;
    const excerptEnd = excerptStart + citation.snippet.length;
    return (
        <div>
            <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={source.isPending}
                aria-expanded={Boolean(preview)}
                onClick={() => preview ? source.reset() : source.mutate()}
            >
                {preview ? "Hide source" : source.isPending ? "Loading source…" : "Show source"}
            </Button>
            {source.isError && <p role="alert">This source revision is unavailable.</p>}
            {preview && (
                <div>
                    <p className="text-muted-foreground">
                        {[
                            preview.page_number != null ? `Page ${preview.page_number}` : null,
                            preview.section_heading,
                            preview.sheet_id,
                            preview.table_row_start != null && preview.table_row_end != null
                                ? `Rows ${preview.table_row_start + 1}–${preview.table_row_end}`
                                : null,
                        ].filter(Boolean).join(" · ")}
                    </p>
                    <p className="whitespace-pre-wrap">
                        {excerptStart >= 0 && citation.snippet ? (
                            <>
                                {preview.content.slice(0, excerptStart)}
                                <mark>{citation.snippet}</mark>
                                {preview.content.slice(excerptEnd)}
                            </>
                        ) : preview.content}
                    </p>
                    {preview.original_pdf_url && (
                        <a
                            href={preview.page_number == null
                                ? preview.original_pdf_url
                                : `${preview.original_pdf_url}#page=${preview.page_number}`}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                        >
                            Open original PDF
                        </a>
                    )}
                </div>
            )}
        </div>
    );
}

export function RagCitationList({ result }: { result: AskResult }) {
    return (
        <section className="grid gap-ui-xs">
            <h3>
                <HelpTooltip termId="grounding" variant="label">Citations (evidence)</HelpTooltip>
            </h3>
            {result.citations.map((citation) => (
                <article
                    key={`${citation.document_id}:${citation.chunk_id}:${citation.index_revision_id}`}
                    id={citation.citation_number != null ? `rag-citation-${citation.citation_number}` : undefined}
                    className="grid gap-ui-xxs rounded-md border border-border p-ui-xs"
                >
                    <span className="text-muted-foreground">
                        {citation.filename} · score {citation.score.toFixed(3)}
                        {citation.page_number != null ? ` · p.${citation.page_number}` : ""}
                        {citation.used_in_answer === false ? " · Retrieved only" : ""}
                    </span>
                    <p>{citation.snippet}</p>
                    <CitationPreview citation={citation} />
                </article>
            ))}
        </section>
    );
}
import { useMutation } from "@tanstack/react-query";
import { getRagCitationSource, type RagCitation } from "@/features/rag/api";
import { Button } from "../../components/ui/button";
