import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import type { RagCompareRequest } from "@/lib/generated/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { FormGrid } from "@/components/ui/FormGrid";
import { Label } from "@/components/ui/label";
import { SectionCard } from "@/components/ui/SectionCard";
import { useRetrievalComparison } from "./useRetrievalComparison";
import type { useRagWorkspace } from "./useRagWorkspace";
import { RetrievalComparisonResults } from "./RetrievalComparisonResults";

type Props = { workspace: ReturnType<typeof useRagWorkspace> };
type Mode = NonNullable<RagCompareRequest["retrieval_mode"]>;
type Draft = RagCompareRequest["draft"];
type Format = NonNullable<NonNullable<RagCompareRequest["metadata_filter"]>["formats"]>[number];
type WorkspaceDocument = Props["workspace"]["documents"][number];

const modes = [["hybrid", "Hybrid"], ["dense", "Vector"], ["lexical", "Keyword"]] as const;
const formats = ["text", "markdown", "pdf", "docx", "csv", "xlsx"] as const;

function optionalNumber(value: string) {
    return value === "" ? undefined : Number(value);
}

function scopeIsReady(
    workspace: Props["workspace"],
    chooseDocuments: boolean,
    documentIds: string[],
) {
    if (chooseDocuments) {
        return documentIds.length > 0 && documentIds.every((id) =>
            workspace.documents.some((doc) => doc.id === id && doc.status === "indexed"));
    }
    return !workspace.selectedDocumentId || workspace.selectedDocument?.status === "indexed";
}

export function RagRetrievalPanel({ workspace }: Props) {
    return (
        <RetrievalComparisonForm
            key={JSON.stringify([workspace.projectId, workspace.selectedDocumentId])}
            workspace={workspace}
        />
    );
}

function ModeAndOutputFields({
    baselineMode,
    draftMode,
    topN,
    chooseDocuments,
    workspace,
    onBaselineMode,
    onDraftMode,
    onTopN,
    onChooseDocuments,
}: {
    baselineMode: Mode;
    draftMode: Mode;
    topN: string;
    chooseDocuments: boolean;
    workspace: Props["workspace"];
    onBaselineMode: (value: Mode) => void;
    onDraftMode: (value: Mode) => void;
    onTopN: (value: string) => void;
    onChooseDocuments: (value: boolean) => void;
}) {
    return (
        <FormGrid columns="4">
            <FormField as="select" label="Baseline search" value={baselineMode}
                onChange={(event) => onBaselineMode(event.currentTarget.value as Mode)}>
                {modes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </FormField>
            <FormField as="select" label="Draft search" value={draftMode}
                onChange={(event) => onDraftMode(event.currentTarget.value as Mode)}>
                {modes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </FormField>
            <FormField type="number" label="Top results" min={1} max={20} required
                value={topN} onChange={(event) => onTopN(event.currentTarget.value)} />
            <FormField as="select" label="Document scope" value={chooseDocuments ? "pick" : "workspace"}
                onChange={(event) => onChooseDocuments(event.currentTarget.value === "pick")}>
                <option value="workspace">
                    {workspace.selectedDocumentId ? "Selected workspace document" : "All indexed in current scope"}
                </option>
                <option value="pick">Choose documents</option>
            </FormField>
        </FormGrid>
    );
}

function SelectedDocumentScope({
    workspace,
    chooseDocuments,
    documentIds,
    ready,
    onDocumentIds,
}: {
    workspace: Props["workspace"];
    chooseDocuments: boolean;
    documentIds: string[];
    ready: boolean;
    onDocumentIds: Dispatch<SetStateAction<string[]>>;
}) {
    const indexedDocuments = workspace.documents.filter((doc) => doc.status === "indexed");
    return (
        <>
            {chooseDocuments && (
                <fieldset className="grid gap-ui-xs rounded-lg border border-border p-ui-sm">
                    <legend>Indexed documents on the current page</legend>
                    {indexedDocuments.map((doc: WorkspaceDocument) => (
                        <Label className="flex items-center gap-ui-xs" key={doc.id}>
                            <Checkbox checked={documentIds.includes(doc.id)}
                                onCheckedChange={(checked) => {
                                    onDocumentIds((ids) => checked
                                        ? [...ids, doc.id]
                                        : ids.filter((id) => id !== doc.id));
                                }} />
                            {doc.original_filename}
                        </Label>
                    ))}
                    {indexedDocuments.length === 0 && (
                        <p className="text-muted-foreground">Index a document to include it in a comparison.</p>
                    )}
                </fieldset>
            )}
            {workspace.selectedDocument && !chooseDocuments && (
                <p className="text-muted-foreground">{workspace.selectedDocument.original_filename}</p>
            )}
            {!ready && (
                <p role="status" className="text-muted-foreground">
                    {chooseDocuments
                        ? "Choose indexed documents available on this page."
                        : "The selected document has no active index yet. Index it or clear the selection."}
                </p>
            )}
        </>
    );
}

function RankingAndFilters({
    draft,
    format,
    language,
    onDraft,
    onFormat,
    onLanguage,
}: {
    draft: Draft;
    format: Format | "";
    language: string;
    onDraft: Dispatch<SetStateAction<Draft>>;
    onFormat: (value: Format | "") => void;
    onLanguage: (value: string) => void;
}) {
    return (
        <details className="grid rounded-lg border border-border p-ui-sm">
            <summary className="cursor-pointer">Ranking and filters</summary>
            <FormGrid columns="3" className="mt-ui-sm">
                <FormField type="number" label="Draft minimum cosine" min={-1} max={1} step={0.01}
                    placeholder="Configured value" value={draft.min_cosine ?? ""}
                    description="Exclude vector matches below this cosine score (−1 to 1); keyword search and displayed RRF scores are unaffected."
                    onChange={(event) => {
                        const minCosine = optionalNumber(event.currentTarget.value);
                        onDraft((current) => ({ ...current, min_cosine: minCosine }));
                    }} />
                <FormField type="number" label="Draft candidate pool" min={1} max={256}
                    placeholder="Configured value" value={draft.candidate_pool ?? ""}
                    description="Per search branch before ranking."
                    onChange={(event) => {
                        const candidatePool = optionalNumber(event.currentTarget.value);
                        onDraft((current) => ({ ...current, candidate_pool: candidatePool }));
                    }} />
                <FormField type="number" label="Draft RRF rank constant" min={1} max={256}
                    placeholder="Configured value" value={draft.rrf_k ?? ""}
                    description="Applies when rank lists are fused."
                    onChange={(event) => {
                        const rrfK = optionalNumber(event.currentTarget.value);
                        onDraft((current) => ({ ...current, rrf_k: rrfK }));
                    }} />
                <FormField as="select" label="Draft reranker" value={draft.reranker ?? "configured"}
                    onChange={(event) => {
                        const reranker = event.currentTarget.value as Draft["reranker"];
                        onDraft((current) => ({ ...current, reranker }));
                    }}>
                    <option value="configured">Configured model</option>
                    <option value="none">Off</option>
                    <option value="heuristic">Unicode overlap</option>
                </FormField>
                <FormField as="select" label="Source format" value={format}
                    onChange={(event) => onFormat(event.currentTarget.value as Format | "")}>
                    <option value="">All formats</option>
                    {formats.map((value) => <option key={value} value={value}>{value}</option>)}
                </FormField>
                <FormField as="select" label="Source language" value={language}
                    onChange={(event) => onLanguage(event.currentTarget.value)}>
                    <option value="">All languages</option>
                    <option value="en">English</option>
                    <option value="nl">Dutch</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="tr">Turkish</option>
                </FormField>
            </FormGrid>
        </details>
    );
}

function ComparisonStatus({
    state,
}: {
    state: ReturnType<typeof useRetrievalComparison>["state"];
}) {
    return (
        <>
            {state.status === "running" && <p role="status">Running baseline and draft searches.</p>}
            {state.status === "cancelled" && <p role="status">Comparison cancelled.</p>}
            {state.status === "error" && <p role="alert">{state.message}</p>}
            {state.status === "complete" && <RetrievalComparisonResults result={state.result} />}
        </>
    );
}

function RetrievalComparisonForm({ workspace }: Props) {
    const [query, setQuery] = useState("");
    const [topN, setTopN] = useState("5");
    const [baselineMode, setBaselineMode] = useState<Mode>("hybrid");
    const [draftMode, setDraftMode] = useState<Mode>("hybrid");
    const [draft, setDraft] = useState<Draft>({});
    const [chooseDocuments, setChooseDocuments] = useState(false);
    const [documentIds, setDocumentIds] = useState<string[]>([]);
    const [format, setFormat] = useState<Format | "">("");
    const [language, setLanguage] = useState("");
    const comparison = useRetrievalComparison();
    const running = comparison.state.status === "running";
    const ready = scopeIsReady(workspace, chooseDocuments, documentIds);
    const scopedIds = chooseDocuments ? documentIds
        : workspace.selectedDocumentId ? [workspace.selectedDocumentId] : undefined;

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!query.trim() || !ready || running) return;
        void comparison.run({
            query: query.trim(),
            project_id: workspace.projectId || undefined,
            document_ids: scopedIds,
            top_k: Number(topN),
            baseline_mode: baselineMode,
            retrieval_mode: draftMode,
            metadata_filter: format || language ? {
                formats: format ? [format] : undefined,
                languages: language ? [language] : undefined,
            } : undefined,
            draft,
        });
    }

    return (
        <SectionCard
            title="Retrieval comparison"
            description="Compare ranked excerpts for one query and document scope. Draft settings apply to this run."
        >
            <div className="grid gap-ui-lg">
                <form className="grid gap-ui-md" onSubmit={submit}>
                    <FormField as="textarea" label="Query" rows={2} maxLength={4000} required
                        value={query} onChange={(event) => setQuery(event.currentTarget.value)} />
                    <ModeAndOutputFields
                        baselineMode={baselineMode}
                        draftMode={draftMode}
                        topN={topN}
                        chooseDocuments={chooseDocuments}
                        workspace={workspace}
                        onBaselineMode={setBaselineMode}
                        onDraftMode={setDraftMode}
                        onTopN={setTopN}
                        onChooseDocuments={setChooseDocuments}
                    />
                    <SelectedDocumentScope
                        workspace={workspace}
                        chooseDocuments={chooseDocuments}
                        documentIds={documentIds}
                        ready={ready}
                        onDocumentIds={setDocumentIds}
                    />
                    <RankingAndFilters
                        draft={draft}
                        format={format}
                        language={language}
                        onDraft={setDraft}
                        onFormat={setFormat}
                        onLanguage={setLanguage}
                    />
                    <div className="flex flex-wrap items-center gap-ui-xs">
                        <Button type="submit" disabled={!query.trim() || !ready || running}>
                            {running ? "Comparing…" : "Compare retrieval"}
                        </Button>
                        {running && <Button type="button" variant="outline" onClick={comparison.cancel}>Cancel</Button>}
                    </div>
                </form>
                <ComparisonStatus state={comparison.state} />
            </div>
        </SectionCard>
    );
}
