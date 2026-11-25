import { Button } from "@/components/ui/button";import { FormField } from "@/components/ui/form-field";
import { CircleCheck as ReviewIcon } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { KeyValueList } from "../../../components/ui/KeyValueList";
import { QueryErrorAlert } from "../../../components/ui/QueryBoundary";
import { SectionCard } from "../../../components/ui/SectionCard";
import { AdvancedSettings } from "../../../components/ui/AdvancedSettings";
import { JsonBlock } from "../../../components/ui/JsonBlock";
import { recordToKeyValueItems } from "../../../components/ui/jsonDisplay";
import { formatDateTime } from "../../../utils/formatters";
import { getQueryErrorMessage } from "../../../utils/queryErrors";
import { datasetCaseDraftSchema, firstSchemaError, parseJsonObject } from "../studioUtils";
import type { AiStudioModel } from "../hooks/useAiStudioView";

export function ReviewsEvaluationsPanel({ m }: { m: AiStudioModel }) {
    const { reviewsIsError, reviewsError, refetchReviews, reviewsLoading, reviews, reviewNotesById, setReviewNotesById, correctionsById, setCorrectionsById, decideReviewMutation, datasetForm, setDatasetForm, createDatasetMutation, selectedDatasetId, setSelectedDatasetId, datasets, datasetCaseForm, setDatasetCaseForm, createDatasetCaseMutation, runForm, setRunForm, selectedTemplateVersions, runEvaluationMutation, datasetCasesIsError, datasetCasesError, refetchDatasetCases, datasetCasesLoading, selectedDatasetCases, evaluationRunsIsError, evaluationRunsError, refetchEvaluationRuns, evaluationRunsLoading, evaluationRuns, showToast } = m;
    return (
        <SectionCard title="Reviews and evaluations" description="Route sensitive outputs through human approval and keep reusable benchmark datasets for prompt regression testing.">
            <div className="flex gap-[16px]">
                <div className="flex gap-[10px]">
                    <p>Review queue</p>
                    {reviewsIsError && (
                        <QueryErrorAlert
                            error={reviewsError}
                            fallback="Failed to load review queue."
                            onRetry={() => void refetchReviews()}
                        />
                    )}
                    {reviewsLoading ? (
                        <div className="flex gap-[10px]">
                            {Array.from({ length: 2 }).map((_: any, index: any) => (
                                <div
                                    key={index}
                                    style={{ borderRadius: 12 }}
                                    className="animate-pulse rounded-md bg-muted" />
                            ))}
                        </div>
                    ) : reviews.length > 0 ? (
                        reviews.map((review) => (
                            <div key={review.id} style={({
                                padding: 16,
                                borderRadius: 16,
                                border: `1px solid ${"var(--border)"}`
                            })}>
                                <div className="flex gap-[8px]">
                                    <div className="flex flex-col sm:flex-row gap-[8px] justify-between">
                                        <p>Run {review.run_id.slice(0, 8)}</p>
                                        <div
                                            className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />
                                    </div>
                                    <FormField
                                        label="Reviewer notes"
                                        value={reviewNotesById[review.id] ?? ""}
                                        onChange={(event: any) => setReviewNotesById((current) => ({ ...current, [review.id]: event.target.value }))} />
                                    <FormField
                                        label="Corrected output"
                                        value={correctionsById[review.id] ?? ""}
                                        onChange={(event: any) => setCorrectionsById((current) => ({ ...current, [review.id]: event.target.value }))}
                                        as="textarea"
                                        rows={2} />
                                    <div className="flex flex-col sm:flex-row gap-[8px]">
                                        <Button
                                            variant="outline"
                                            onClick={() => decideReviewMutation.mutate({ reviewId: review.id, status: "approved", reviewer_notes: reviewNotesById[review.id], corrected_output: correctionsById[review.id] })}
                                            type="button">
                                            Approve
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => decideReviewMutation.mutate({ reviewId: review.id, status: "changes_requested", reviewer_notes: reviewNotesById[review.id], corrected_output: correctionsById[review.id] })}
                                            type="button">
                                            Request changes
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => decideReviewMutation.mutate({ reviewId: review.id, status: "rejected", reviewer_notes: reviewNotesById[review.id] })}
                                            type="button">
                                            Reject
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <EmptyState icon={<ReviewIcon />} title="No reviews queued" description="Review requests created from runs will appear here." />
                    )}
                </div>

                <div className="flex gap-[12px]">
                    <p>Evaluation datasets</p>
                    <FormField
                        label="Dataset name"
                        value={datasetForm.name}
                        onChange={(event: any) => setDatasetForm((current) => ({ ...current, name: event.target.value }))} />
                    <FormField
                        label="Dataset description"
                        value={datasetForm.description}
                        onChange={(event: any) => setDatasetForm((current) => ({ ...current, description: event.target.value }))} />
                    <Button
                        variant="outline"
                        disabled={createDatasetMutation.isPending || !datasetForm.name.trim()}
                        onClick={() => createDatasetMutation.mutate(datasetForm)}
                        type="button">
                        {createDatasetMutation.isPending ? "Creating..." : "Create evaluation dataset"}
                    </Button>
                    <FormField
                        as="select"
                        label="Selected dataset"
                        value={selectedDatasetId}
                        onChange={(event: any) => setSelectedDatasetId(event.target.value)}>
                        {datasets.map((dataset) => (
                            <option key={dataset.id}>
                                {dataset.name}
                            </option>
                        ))}
                    </FormField>
                    <FormField
                        label="Case input variables JSON"
                        value={datasetCaseForm.input_variables_json}
                        onChange={(event: any) => setDatasetCaseForm((current) => ({ ...current, input_variables_json: event.target.value }))}
                        as="textarea"
                        rows={4} />
                    <FormField
                        label="Retrieval query"
                        value={datasetCaseForm.retrieval_query}
                        onChange={(event: any) => setDatasetCaseForm((current) => ({ ...current, retrieval_query: event.target.value }))} />
                    <FormField
                        label="Expected chunk IDs"
                        description="Comma-separated chunk IDs used to calculate citation hit rate."
                        value={datasetCaseForm.expected_chunk_ids}
                        onChange={(event: any) => setDatasetCaseForm((current) => ({ ...current, expected_chunk_ids: event.target.value }))} />
                    <div className="flex flex-row gap-[8px] flex-wrap">
                        {m.documents.map((document) => (
                            <div
                                key={document.id}
                                onClick={() => m.toggleEvaluationDocument(document.id)}
                                className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />
                        ))}
                    </div>
                    <FormField
                        label="Expected output text"
                        value={datasetCaseForm.expected_output_text}
                        onChange={(event: any) => setDatasetCaseForm((current) => ({ ...current, expected_output_text: event.target.value }))}
                        as="textarea"
                        rows={2} />
                    <FormField
                        label="Expected output JSON"
                        value={datasetCaseForm.expected_output_json}
                        onChange={(event: any) => setDatasetCaseForm((current) => ({ ...current, expected_output_json: event.target.value }))}
                                        as="textarea"
                        rows={2} />
                    <FormField
                        label="Notes"
                        value={datasetCaseForm.notes}
                        onChange={(event: any) => setDatasetCaseForm((current) => ({ ...current, notes: event.target.value }))} />
                    <Button
                        variant="outline"
                        disabled={createDatasetCaseMutation.isPending || !selectedDatasetId}
                        onClick={() => {
                            const result = datasetCaseDraftSchema.safeParse(datasetCaseForm);
                            if (!result.success) {
                                showToast({ message: firstSchemaError(result), severity: "error" });
                                return;
                            }
                            try {
                                createDatasetCaseMutation.mutate({
                                    datasetId: selectedDatasetId,
                                    payload: {
                                        input_variables: parseJsonObject(result.data.input_variables_json),
                                        retrieval_query: result.data.retrieval_query || null,
                                        document_ids: m.selectedEvaluationDocumentIds,
                                        expected_chunk_ids: result.data.expected_chunk_ids.split(",").map((id) => id.trim()).filter(Boolean),
                                        expected_output_text: result.data.expected_output_text || null,
                                        expected_output_json: result.data.expected_output_json.trim()
                                            ? parseJsonObject(result.data.expected_output_json)
                                            : null,
                                        notes: result.data.notes || null,
                                    },
                                });
                            } catch (error) {
                                showToast({
                                    message: getQueryErrorMessage(error, "Invalid dataset case JSON."),
                                    severity: "error",
                                });
                            }
                        }}
                        type="button">
                        {createDatasetCaseMutation.isPending ? "Saving..." : "Add dataset case"}
                    </Button>
                    <FormField
                        as="select"
                        label="Prompt version for evaluation"
                        value={runForm.prompt_version_id}
                        onChange={(event: any) => setRunForm((current) => ({ ...current, prompt_version_id: event.target.value }))}>
                        {selectedTemplateVersions.map((version) => (
                            <option key={version.id}>
                                v{version.version_number} • {version.model_name}
                            </option>
                        ))}
                    </FormField>
                    <Button
                        variant="default"
                        disabled={runEvaluationMutation.isPending || !selectedDatasetId || !runForm.prompt_version_id}
                        onClick={() => runEvaluationMutation.mutate({ datasetId: selectedDatasetId, promptVersionId: runForm.prompt_version_id })}
                        type="button">
                        {runEvaluationMutation.isPending ? "Starting..." : "Run evaluation"}
                    </Button>
                    {selectedDatasetId && datasetCasesIsError && (
                        <QueryErrorAlert
                            error={datasetCasesError}
                            fallback="Failed to load dataset cases."
                            onRetry={() => void refetchDatasetCases()}
                        />
                    )}
                    {selectedDatasetId && datasetCasesLoading ? (
                        <div className="flex gap-[8px]">
                            {Array.from({ length: 2 }).map((_: any, index: any) => (
                                <div
                                    key={index}
                                    style={{ borderRadius: 8 }}
                                    className="animate-pulse rounded-md bg-muted" />
                            ))}
                        </div>
                    ) : selectedDatasetCases.length > 0 ? (
                        <div className="flex gap-[8px]">
                            {selectedDatasetCases.map((item) => (
                                <div key={item.id} style={({
                                    padding: 12,
                                    borderRadius: 12,
                                    border: `1px solid ${"var(--border)"}`
                                })}>
                                    {recordToKeyValueItems(item.input_variables).length ? (
                                        <KeyValueList
                                            dense
                                            items={recordToKeyValueItems(item.input_variables)}
                                        />
                                    ) : (
                                        <p className="text-muted-foreground">
                                            No input variables
                                        </p>
                                    )}
                                    <AdvancedSettings title="Raw input variables" className="mt-1">
                                        <JsonBlock data={item.input_variables} />
                                    </AdvancedSettings>
                                    {item.expected_output_text && (
                                        <span className="text-muted-foreground">
                                            Expected: {item.expected_output_text}
                                        </span>
                                    )}
                                    {item.expected_chunk_ids.length > 0 && (
                                        <span className="text-muted-foreground">
                                            Expected chunks: {item.expected_chunk_ids.length}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : null}
                    {evaluationRunsIsError && (
                        <QueryErrorAlert
                            error={evaluationRunsError}
                            fallback="Failed to load evaluation runs."
                            onRetry={() => void refetchEvaluationRuns()}
                        />
                    )}
                    {evaluationRunsLoading ? (
                        <div className="flex gap-[8px]">
                            {Array.from({ length: 2 }).map((_: any, index: any) => (
                                <div
                                    key={index}
                                    style={{ borderRadius: 8 }}
                                    className="animate-pulse rounded-md bg-muted" />
                            ))}
                        </div>
                    ) : evaluationRuns.length > 0 ? (
                        <div className="flex gap-[8px]">
                            {evaluationRuns.map((run) => (
                                <div
                                    key={run.id}
                                    role="alert"
                                    className="rounded-lg border border-border p-3 text-sm">
                                    {formatDateTime(run.created_at)}:{" "}
                                    {run.status === "running"
                                        ? `Running (${run.total_cases} cases)...`
                                        : run.status === "failed"
                                          ? "Evaluation failed"
                                          : `${run.passed_cases}/${run.total_cases} passed, average score ${run.average_score}`}
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>
            </div>
        </SectionCard>
    );
}
