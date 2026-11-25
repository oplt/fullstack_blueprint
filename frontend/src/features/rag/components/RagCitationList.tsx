import { HelpTooltip } from "../../../components/ui/HelpTooltip";
import type { useRagWorkspace } from "../hooks/useRagWorkspace";

type AskResult = NonNullable<ReturnType<typeof useRagWorkspace>["askResult"]>;

export function RagCitationList({ result }: { result: AskResult }) {
    return (
        <section className="grid gap-2">
            <h3>
                <HelpTooltip termId="grounding" variant="label">Citations (evidence)</HelpTooltip>
            </h3>
            {result.citations.map((citation) => (
                <article
                    key={`${citation.document_id}:${citation.chunk_id}`}
                    className="grid gap-1 rounded-md border border-border p-2"
                >
                    <span className="text-muted-foreground">
                        {citation.filename} · score {citation.score.toFixed(3)}
                        {citation.page_number != null ? ` · p.${citation.page_number}` : ""}
                    </span>
                    <p>{citation.snippet}</p>
                </article>
            ))}
        </section>
    );
}
