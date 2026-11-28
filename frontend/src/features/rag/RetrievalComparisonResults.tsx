import type {
    RagCompareResponse,
    RagRetrievalDiagnostics,
    RagRetrieveResponse,
    RagRetrievedChunkResponse,
} from "@/lib/generated/types";
import { CitationPreview } from "./RagCitationList";

const scoreLabels: Record<RagRetrievalDiagnostics["score_kind"], string> = {
    rrf: "RRF rank score",
    cosine: "Cosine similarity",
    lexical_rank: "Keyword rank score",
    none: "Score",
};
const retrievalSourceLabels: Record<string, string> = {
    dense: "Vector",
    lexical: "Keyword",
    parent_expand: "Parent context",
};

function sourceSummary(hit?: RagRetrievedChunkResponse) {
    const sources = hit?.retrieval_sources ?? [];
    return sources.map((source) => retrievalSourceLabels[source]).filter(Boolean).join(" + ") || null;
}

function branchSummary(
    count: number | undefined,
    pool: number | undefined,
    status: string | undefined,
    time: number | undefined,
) {
    return `${count ?? 0} of ${pool ?? 0} · ${status ?? "unavailable"}${time == null ? "" : ` · ${time} ms`}`;
}

function vectorDiagnostic(info?: RagRetrievalDiagnostics | null): [string, string] {
    return ["Vector", branchSummary(
        info?.dense_candidates,
        info?.dense_pool,
        info?.branch_status?.dense_branch,
        info?.stage_timings_ms?.dense_work,
    )];
}

function keywordDiagnostic(info?: RagRetrievalDiagnostics | null): [string, string] {
    return ["Keyword", branchSummary(
        info?.lexical_candidates,
        info?.lexical_pool,
        info?.branch_status?.lexical_branch,
        info?.stage_timings_ms?.lexical_work,
    )];
}

function rerankerDiagnostic(run: RagRetrieveResponse): [string, string] {
    return ["Reranker", `${run.reranker ?? "Unavailable"}${run.reranking_status ? ` · ${run.reranking_status}` : ""}`];
}

function diagnosticRows(run: RagRetrieveResponse): Array<[string, string]> {
    const info = run.diagnostics;
    const rows: Array<[string, string]> = [
        vectorDiagnostic(info),
        keywordDiagnostic(info),
        ["Minimum cosine", String(info?.min_cosine ?? "—")],
        rerankerDiagnostic(run),
    ];
    if (info?.score_kind === "rrf") rows.splice(3, 0, ["RRF constant", String(info.rrf_k ?? "—")]);
    if (info?.rerank_window) rows.push(["Rerank window", String(info.rerank_window)]);
    return rows;
}

function RunMessages({ run }: { run: RagRetrieveResponse }) {
    return (
        <>
            {run.degraded && <p role="alert">Search completed with limited results.</p>}
            {run.no_matches && <p>No matching excerpts in this run.</p>}
            {Boolean(run.injection_chunks_filtered) && (
                <p className="text-muted-foreground">{run.injection_chunks_filtered} suspicious excerpts skipped.</p>
            )}
        </>
    );
}

function RankingDiagnostics({ title, run }: { title: string; run: RagRetrieveResponse }) {
    const rows = diagnosticRows(run);
    return (
        <section aria-label={title} className="grid gap-ui-xs border-t border-border py-ui-sm">
            <h3 className="font-semibold">{title}</h3>
            <RunMessages run={run} />
            <p className="text-muted-foreground">
                {run.chunks.length} ranked · cache {run.diagnostics?.cache ?? "unavailable"}
            </p>
            <dl className="grid grid-cols-2 gap-ui-xs text-body-md">
                {rows.map(([label, value]) => (
                    <span className="contents" key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                    </span>
                ))}
            </dl>
        </section>
    );
}

type Match = { baseline?: RagRetrievedChunkResponse; candidate?: RagRetrievedChunkResponse };

function alignResults(result: RagCompareResponse) {
    const matches = new Map<string, Match>();
    for (const side of ["baseline", "candidate"] as const) {
        result[side].chunks.forEach((chunk, index) => {
            const key = JSON.stringify([chunk.document_id, chunk.chunk_id, chunk.index_revision_id]);
            matches.set(key, { ...matches.get(key), [side]: { ...chunk, rank: chunk.rank ?? index + 1 } });
        });
    }
    return matches;
}

function Rank({ hit }: { hit?: RagRetrievedChunkResponse }) {
    return hit ? (
        <span className="tabular-nums">
            #{hit.rank} <span className="text-muted-foreground">({hit.score.toFixed(3)})</span>
        </span>
    ) : <span aria-label="Absent">—</span>;
}

function SourceProvenance({ match }: { match: Match }) {
    const baselineSource = sourceSummary(match.baseline);
    const candidateSource = sourceSummary(match.candidate);
    if (!baselineSource && !candidateSource) return null;
    return (
        <p className="text-muted-foreground">
            {baselineSource && `Baseline matched by ${baselineSource}`}
            {baselineSource && candidateSource ? " · " : ""}
            {candidateSource && `Draft matched by ${candidateSource}`}
        </p>
    );
}

function Excerpt({ content }: { content: string }) {
    const snippet = content.slice(0, 280);
    return <p>{snippet}{content.length > snippet.length && "…"}</p>;
}

function ComparisonRow({ rowKey, match }: { rowKey: string; match: Match }) {
    const chunk = match.baseline ?? match.candidate;
    if (!chunk) return null;
    const snippet = chunk.content.slice(0, 280);
    return (
        <tr key={rowKey} className="border-b border-border align-top">
            <td className="max-w-prose p-ui-xs">
                <div className="grid gap-ui-xs">
                    <p className="font-medium">
                        {chunk.filename}{chunk.page_number != null && ` · page ${chunk.page_number}`}
                    </p>
                    <SourceProvenance match={match} />
                    <Excerpt content={chunk.content} />
                    <CitationPreview citation={{ ...chunk, snippet }} />
                </div>
            </td>
            <td className="whitespace-nowrap p-ui-xs"><Rank hit={match.baseline} /></td>
            <td className="whitespace-nowrap p-ui-xs"><Rank hit={match.candidate} /></td>
        </tr>
    );
}

function ComparisonTable({
    result,
    matches,
}: {
    result: RagCompareResponse;
    matches: Map<string, Match>;
}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-body-md">
                <caption className="pb-ui-xs text-left text-muted-foreground">
                    Retrieved excerpts. Each score applies to its own ranking method.
                </caption>
                <thead>
                    <tr className="border-b border-border">
                        <th scope="col" className="p-ui-xs text-left">Source</th>
                        <th scope="col" className="p-ui-xs text-left">
                            Baseline <span className="block font-normal">{scoreLabels[result.baseline.diagnostics?.score_kind ?? "none"]}</span>
                        </th>
                        <th scope="col" className="p-ui-xs text-left">
                            Draft <span className="block font-normal">{scoreLabels[result.candidate.diagnostics?.score_kind ?? "none"]}</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {[...matches].map(([rowKey, match]) => (
                        <ComparisonRow key={rowKey} rowKey={rowKey} match={match} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function RetrievalComparisonResults({ result }: { result: RagCompareResponse }) {
    const matches = alignResults(result);
    return (
        <div className="grid min-w-0 gap-ui-md">
            <p role="status">
                {result.document_count
                    ? `Compared ${result.document_count} indexed document(s).`
                    : "No indexed documents in this scope. Index a document or choose another scope."}
            </p>
            <div className="grid gap-ui-md sm:grid-cols-2">
                <RankingDiagnostics title="Baseline" run={result.baseline} />
                <RankingDiagnostics title="Draft" run={result.candidate} />
            </div>
            {matches.size > 0 && <ComparisonTable result={result} matches={matches} />}
        </div>
    );
}
