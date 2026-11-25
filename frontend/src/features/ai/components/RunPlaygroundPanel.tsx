import { Button } from "@/components/ui/button";import { FormField } from "@/components/ui/form-field";
import { Sparkles as AiIcon, PlayCircle as RunIcon } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { AdvancedSettings } from "../../../components/ui/AdvancedSettings";
import { JsonBlock } from "../../../components/ui/JsonBlock";
import { SectionCard } from "../../../components/ui/SectionCard";
import { formatDateTime } from "../../../utils/formatters";
import { aiRunDraftSchema, firstSchemaError, formatCostMicros, parseJsonObject } from "../studioUtils";
import type { AiStudioModel } from "../hooks/useAiStudioView";

export function RunPlaygroundPanel({ m }: { m: AiStudioModel }) {
    const { runForm, setRunForm, templateKeyOptions, documents, selectedDocumentIds, toggleDocument, createRunMutation, showToast, recentRuns, createReviewMutation, createFeedbackMutation, feedbackCommentByRunId, setFeedbackCommentByRunId, correctionsById, setCorrectionsById } = m;
    return (
        <SectionCard title="Run playground" description="Execute prompt versions with structured variables, retrieval context, and human-review routing.">
            <div className="flex gap-[16px]">
                <FormField
                    as="select"
                    label="Prompt template"
                    value={runForm.prompt_template_key}
                    onChange={(event: any) => setRunForm((current) => ({ ...current, prompt_template_key: event.target.value }))}>
                    {templateKeyOptions.map((template) => (
                        <option key={template.id}>
                            {template.name} ({template.key})
                        </option>
                    ))}
                </FormField>
                <FormField
                    label="Variables JSON"
                    value={runForm.variables_json}
                    onChange={(event: any) => setRunForm((current) => ({ ...current, variables_json: event.target.value }))}
                    multiline
                    rows={8} />
                <FormField
                    label="Retrieval query"
                    value={runForm.retrieval_query}
                    onChange={(event: any) => setRunForm((current) => ({ ...current, retrieval_query: event.target.value }))} />
                <FormField
                    label="Top K chunks"
                    value={runForm.top_k}
                    onChange={(event: any) => setRunForm((current) => ({ ...current, top_k: event.target.value }))} />
                <div className="flex flex-row gap-[8px] flex-wrap">
                    {documents.map((document) => (
                        <div
                            key={document.id}
                            onClick={() => toggleDocument(document.id)}
                            className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />
                    ))}
                </div>
                <label><input
                            checked={runForm.review_required}
                            onChange={(event: any) => setRunForm((current) => ({ ...current, review_required: event.target.checked }))}
                            type="checkbox"
                            role="switch" /></label>
                <Button
                    variant="default"
                    disabled={createRunMutation.isPending || !runForm.prompt_template_key}
                    onClick={() => {
                        const result = aiRunDraftSchema.safeParse(runForm);
                        if (!result.success) {
                            showToast({ message: firstSchemaError(result), severity: "error" });
                            return;
                        }
                        createRunMutation.mutate({
                            prompt_template_key: result.data.prompt_template_key,
                            variables: parseJsonObject(result.data.variables_json),
                            retrieval_query: result.data.retrieval_query || undefined,
                            document_ids: selectedDocumentIds,
                            top_k: Number(result.data.top_k),
                            review_required: result.data.review_required,
                        });
                    }}
                    type="button"
                ><RunIcon />
                    {createRunMutation.isPending ? "Running..." : "Run prompt"}
                </Button>
                {recentRuns.length > 0 ? (
                    <div className="flex gap-[10px]">
                        {recentRuns.map((run) => (
                            <div key={run.id} style={({
                                padding: 16,
                                borderRadius: 16,
                                border: `1px solid ${"var(--border)"}`
                            })}>
                                <div className="flex gap-[8px]">
                                    <div className="flex flex-col sm:flex-row gap-[8px] justify-between">
                                        <p>
                                            {run.provider_key}/{run.model_name}
                                        </p>
                                        <div
                                            className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />
                                    </div>
                                    <p className="text-muted-foreground">
                                        {run.output_text?.trim()
                                            ? run.output_text.slice(0, 280) +
                                              (run.output_text.length > 280 ? "…" : "")
                                            : run.output_json
                                              ? "Structured JSON output available under Raw."
                                              : "No output"}
                                    </p>
                                    {run.output_json && !run.output_text?.trim() ? (
                                        <AdvancedSettings title="Raw JSON">
                                            <JsonBlock data={run.output_json} maxHeight={240} />
                                        </AdvancedSettings>
                                    ) : null}
                                    <span className="text-muted-foreground">
                                        {formatDateTime(run.created_at)} • {run.total_tokens} tokens • {formatCostMicros(run.estimated_cost_micros)}
                                    </span>
                                    {(run.retrieval_degraded || run.memory_degraded) && (
                                        <div
                                            style={{ alignSelf: "flex-start" }}
                                            className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />
                                    )}
                                    <div className="flex flex-col sm:flex-row gap-[8px]">
                                        <Button
                                            variant="outline"
                                            onClick={() => createReviewMutation.mutate(run.id)}
                                            type="button">
                                            Request review
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => createFeedbackMutation.mutate({
                                                runId: run.id,
                                                rating: 1,
                                                comment: feedbackCommentByRunId[run.id],
                                            })}
                                            type="button">
                                            Thumbs up
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => createFeedbackMutation.mutate({
                                                runId: run.id,
                                                rating: -1,
                                                comment: feedbackCommentByRunId[run.id],
                                                corrected_output: correctionsById[run.id],
                                            })}
                                            type="button">
                                            Thumbs down
                                        </Button>
                                    </div>
                                    <FormField
                                        label="Feedback note"
                                        value={feedbackCommentByRunId[run.id] ?? ""}
                                        onChange={(event: any) =>
                                            setFeedbackCommentByRunId((current) => ({ ...current, [run.id]: event.target.value }))
                                        } />
                                    <FormField
                                        label="Correction"
                                        value={correctionsById[run.id] ?? ""}
                                        onChange={(event: any) =>
                                            setCorrectionsById((current) => ({ ...current, [run.id]: event.target.value }))
                                        }
                                        multiline
                                        rows={2} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState icon={<AiIcon />} title="No AI runs yet" description="Run a prompt version to capture outputs, token usage, and review state." />
                )}
            </div>
        </SectionCard>
    );
}
