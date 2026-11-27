
import { useId } from "react";
import {
    Check,
    ClipboardCheck,
    FileText,
    LoaderCircle,
    PlayCircle,
    Sparkles,
    ThumbsDown,
    ThumbsUp,
    TriangleAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { AdvancedSettings } from "../../../components/ui/AdvancedSettings";
import { EmptyState } from "../../../components/ui/EmptyState";
import { JsonBlock } from "../../../components/ui/JsonBlock";
import { SectionCard } from "../../../components/ui/SectionCard";
import { formatDateTime } from "../../../utils/formatters";

import {
    aiRunDraftSchema,
    firstSchemaError,
    formatCostMicros,
    parseJsonObject,
} from "../studioUtils";

import type { AiStudioModel } from "../hooks/useAiStudioView";

type AiRun = AiStudioModel["recentRuns"][number];

type BadgeVariant =
    | "default"
    | "secondary"
    | "outline"
    | "destructive"
    | "success"
    | "warning"
    | "information";

function formatStatus(status: string): string {
    const normalized = status.replace(/[_-]+/g, " ").trim();

    return normalized
        ? normalized.charAt(0).toUpperCase() + normalized.slice(1)
        : "Unknown";
}

function getStatusVariant(status: string): BadgeVariant {
    switch (status.toLowerCase()) {
        case "completed":
        case "success":
        case "succeeded":
        case "approved":
            return "success";

        case "failed":
        case "error":
        case "rejected":
            return "destructive";

        case "pending":
        case "queued":
        case "changes_requested":
        case "pending_review":
            return "warning";

        case "running":
        case "processing":
            return "information";

        default:
            return "secondary";
    }
}

function RunStatusBadge({ status }: { status: string }) {
    return (
        <Badge variant={getStatusVariant(status)}>
            {formatStatus(status)}
        </Badge>
    );
}

function RunDegradationNotice({ run }: { run: AiRun }) {
    if (!run.retrieval_degraded && !run.memory_degraded) {
        return null;
    }

    return (
        <div className="flex flex-col ui-auto-run-playground-panel-run-degradation-notice-div">
            <div className="flex flex-wrap items-center gap-ui-xs">
                <TriangleAlert
                    className="shrink-0 ui-auto-run-playground-panel-run-degradation-notice-triangle-alert"
                    aria-hidden="true"
                />

                {run.retrieval_degraded && (
                    <Badge variant="warning">
                        Retrieval degraded
                    </Badge>
                )}

                {run.memory_degraded && (
                    <Badge variant="warning">
                        Memory degraded
                    </Badge>
                )}
            </div>

            {run.degradation_reason && (
                <p className="break-words ui-auto-run-playground-panel-run-degradation-notice-p">
                    {run.degradation_reason}
                </p>
            )}
        </div>
    );
}

function RunOutput({ run }: { run: AiRun }) {
    const outputText = run.output_text?.trim();

    if (run.error_message) {
        return (
            <div
                role="alert"
                className="flex items-start ui-auto-run-playground-panel-run-output-div"
            >
                <TriangleAlert
                    className="shrink-0 ui-auto-run-playground-panel-run-output-triangle-alert"
                    aria-hidden="true"
                />

                <p className="min-w-0 break-words">
                    {run.error_message}
                </p>
            </div>
        );
    }

    return (
        <div className="flex min-w-0 flex-col gap-ui-sm">
            {outputText ? (
                <>
                    <p className="whitespace-pre-wrap break-words ui-auto-run-playground-panel-run-output-p">
                        {outputText.slice(0, 280)}
                        {outputText.length > 280 ? "…" : ""}
                    </p>

                    {outputText.length > 280 && (
                        <AdvancedSettings title="Full output">
                            <div className="overflow-auto whitespace-pre-wrap break-words ui-auto-run-playground-panel-run-output-div-6e4f747">
                                {outputText}
                            </div>
                        </AdvancedSettings>
                    )}
                </>
            ) : (
                <p className="ui-auto-run-playground-panel-run-output-p-73383af">
                    {run.output_json
                        ? "Structured JSON output available below."
                        : "No output available."}
                </p>
            )}

            {run.output_json && (
                <AdvancedSettings title="Raw JSON">
                    <JsonBlock
                        data={run.output_json}
                        maxHeight={240}
                    />
                </AdvancedSettings>
            )}
        </div>
    );
}

function RunMetrics({ run }: { run: AiRun }) {
    return (
        <dl className="grid ui-auto-run-playground-panel-run-metrics-dl">
            <div className="min-w-0 space-y-ui-xxs">
                <dt className="ui-auto-run-playground-panel-run-metrics-dt">
                    Input tokens
                </dt>

                <dd className="ui-auto-run-playground-panel-run-metrics-dd">
                    {run.input_tokens.toLocaleString()}
                </dd>
            </div>

            <div className="min-w-0 space-y-ui-xxs">
                <dt className="ui-auto-run-playground-panel-run-metrics-dt-6b11140">
                    Output tokens
                </dt>

                <dd className="ui-auto-run-playground-panel-run-metrics-dd-83f4b8a">
                    {run.output_tokens.toLocaleString()}
                </dd>
            </div>

            <div className="min-w-0 space-y-ui-xxs">
                <dt className="ui-auto-run-playground-panel-run-metrics-dt-6b11140-x">
                    Total tokens
                </dt>

                <dd className="ui-auto-run-playground-panel-run-metrics-dd-83f4b8a-x">
                    {run.total_tokens.toLocaleString()}
                </dd>
            </div>

            <div className="min-w-0 space-y-ui-xxs">
                <dt className="ui-auto-run-playground-panel-run-metrics-dt-6b11140-x-x">
                    Estimated cost
                </dt>

                <dd className="ui-auto-run-playground-panel-run-metrics-dd-83f4b8a-x-x">
                    {formatCostMicros(run.estimated_cost_micros)}
                </dd>
            </div>

            {run.latency_ms !== null && (
                <div className="min-w-0 space-y-ui-xxs">
                    <dt className="ui-auto-run-playground-panel-run-metrics-dt-6b11140-x-x-x">
                        Latency
                    </dt>

                    <dd className="ui-auto-run-playground-panel-run-metrics-dd-83f4b8a-x-x-x">
                        {run.latency_ms.toLocaleString()} ms
                    </dd>
                </div>
            )}
        </dl>
    );
}

function RetrievalDocumentSelector({ m }: { m: AiStudioModel }) {
    const {
        documents,
        selectedDocumentIds,
        toggleDocument,
        createRunMutation,
    } = m;

    const selectedCount = documents.filter((document) =>
        selectedDocumentIds.includes(document.id),
    ).length;

    return (
        <fieldset
            disabled={createRunMutation.isPending}
            className="min-w-0 space-y-ui-sm"
        >
            <legend className="ui-auto-run-playground-panel-retrieval-document-selector-legend">
                Retrieval documents
            </legend>

            <div className="flex flex-wrap items-center justify-between gap-ui-xs">
                <p className="ui-auto-run-playground-panel-retrieval-document-selector-p">
                    Select documents to include as retrieval context.
                </p>

                <Badge variant="secondary">
                    {selectedCount} selected
                </Badge>
            </div>

            {documents.length > 0 ? (
                <div className="flex flex-wrap gap-ui-xs">
                    {documents.map((document) => {
                        const selected = selectedDocumentIds.includes(
                            document.id,
                        );

                        return (
                            <Button
                                key={document.id}
                                type="button"
                                size="category"
                                variant="category"
                                aria-pressed={selected}
                                disabled={createRunMutation.isPending}
                                onClick={() => toggleDocument(document.id)}
                                className="h-auto max-w-full justify-start ui-auto-run-playground-panel-retrieval-document-selector-button"
                            >
                                {selected ? (
                                    <Check
                                        className="shrink-0 ui-auto-run-playground-panel-retrieval-document-selector-check"
                                        aria-hidden="true"
                                    />
                                ) : (
                                    <FileText
                                        className="shrink-0 ui-auto-run-playground-panel-retrieval-document-selector-file-text"
                                        aria-hidden="true"
                                    />
                                )}

                                <span className="min-w-0 break-words">
                                    {document.title}
                                </span>
                            </Button>
                        );
                    })}
                </div>
            ) : (
                <p className="ui-auto-run-playground-panel-retrieval-document-selector-p-5b70f66">
                    No retrieval documents are available.
                    You can still execute a prompt without selecting documents.
                </p>
            )}
        </fieldset>
    );
}

function RunFeedback({ m, run }: {
    m: AiStudioModel;
    run: AiRun;
}) {
    const {
        createReviewMutation,
        createFeedbackMutation,
        feedbackCommentByRunId,
        setFeedbackCommentByRunId,
        correctionsById,
        setCorrectionsById,
    } = m;

    const reviewPending =
        createReviewMutation.isPending &&
        createReviewMutation.variables === run.id;

    const feedbackPending =
        createFeedbackMutation.isPending &&
        createFeedbackMutation.variables?.runId === run.id;

    const positiveFeedbackPending =
        feedbackPending &&
        createFeedbackMutation.variables?.rating === 1;

    const negativeFeedbackPending =
        feedbackPending &&
        createFeedbackMutation.variables?.rating === -1;

    return (
        <div className="flex flex-col ui-auto-run-playground-panel-run-feedback-div">
            <div className="flex flex-wrap items-center gap-ui-xs">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={createReviewMutation.isPending}
                    onClick={() => createReviewMutation.mutate(run.id)}
                >
                    {reviewPending ? (
                        <LoaderCircle
                            className="ui-auto-run-playground-panel-run-feedback-loader-circle"
                            aria-hidden="true"
                        />
                    ) : (
                        <ClipboardCheck
                            className="ui-auto-run-playground-panel-run-feedback-clipboard-check"
                            aria-hidden="true"
                        />
                    )}

                    {reviewPending
                        ? "Requesting review..."
                        : "Request review"}
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={createFeedbackMutation.isPending}
                    onClick={() =>
                        createFeedbackMutation.mutate({
                            runId: run.id,
                            rating: 1,
                            comment: feedbackCommentByRunId[run.id],
                        })
                    }
                >
                    {positiveFeedbackPending ? (
                        <LoaderCircle
                            className="ui-auto-run-playground-panel-run-feedback-loader-circle-aecdd49"
                            aria-hidden="true"
                        />
                    ) : (
                        <ThumbsUp
                            className="ui-auto-run-playground-panel-run-feedback-thumbs-up"
                            aria-hidden="true"
                        />
                    )}

                    Thumbs up
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={createFeedbackMutation.isPending}
                    onClick={() =>
                        createFeedbackMutation.mutate({
                            runId: run.id,
                            rating: -1,
                            comment: feedbackCommentByRunId[run.id],
                            corrected_output: correctionsById[run.id],
                        })
                    }
                >
                    {negativeFeedbackPending ? (
                        <LoaderCircle
                            className="ui-auto-run-playground-panel-run-feedback-loader-circle-aecdd49-x"
                            aria-hidden="true"
                        />
                    ) : (
                        <ThumbsDown
                            className="ui-auto-run-playground-panel-run-feedback-thumbs-down"
                            aria-hidden="true"
                        />
                    )}

                    Thumbs down
                </Button>
            </div>

            <div className="grid min-w-0 ui-auto-run-playground-panel-run-feedback-div-db8083d">
                <FormField
                    as="textarea"
                    label="Feedback note"
                    placeholder="Describe what worked or what needs improvement..."
                    rows={3}
                    value={feedbackCommentByRunId[run.id] ?? ""}
                    disabled={feedbackPending}
                    onChange={(event) => {
                        const value = event.currentTarget.value;

                        setFeedbackCommentByRunId((current) => ({
                            ...current,
                            [run.id]: value,
                        }));
                    }}
                />

                <FormField
                    as="textarea"
                    label="Correction"
                    placeholder="Provide the expected or corrected output..."
                    rows={3}
                    value={correctionsById[run.id] ?? ""}
                    disabled={feedbackPending}
                    onChange={(event) => {
                        const value = event.currentTarget.value;

                        setCorrectionsById((current) => ({
                            ...current,
                            [run.id]: value,
                        }));
                    }}
                />
            </div>
        </div>
    );
}

function RecentRunCard({ m, run }: {
    m: AiStudioModel;
    run: AiRun;
}) {
    return (
        <Card size="sm" className="min-w-0">
            <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-ui-sm">
                    <div className="min-w-0 space-y-ui-xxs">
                        <CardTitle as="h3" className="break-words">
                            {run.provider_key}/{run.model_name}
                        </CardTitle>

                        <p className="ui-auto-run-playground-panel-recent-run-card-p">
                            {formatDateTime(run.created_at)}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-ui-xs">
                        <RunStatusBadge status={run.status} />

                        {run.review_status && (
                            <Badge
                                variant={getStatusVariant(
                                    run.review_status,
                                )}
                            >
                                Review: {formatStatus(run.review_status)}
                            </Badge>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex min-w-0 flex-col gap-ui-md">
                <RunDegradationNotice run={run} />

                {run.injection_chunks_filtered > 0 && (
                    <div className="flex flex-wrap items-center gap-ui-xs">
                        <Badge variant="warning">
                            <TriangleAlert
                                className="ui-auto-run-playground-panel-recent-run-card-triangle-alert"
                                aria-hidden="true"
                            />

                            {run.injection_chunks_filtered} suspicious{" "}
                            {run.injection_chunks_filtered === 1
                                ? "chunk"
                                : "chunks"}{" "}
                            filtered
                        </Badge>
                    </div>
                )}

                <RunOutput run={run} />

                <RunMetrics run={run} />

                <RunFeedback m={m} run={run} />
            </CardContent>
        </Card>
    );
}

export function RunPlaygroundPanel({ m }: { m: AiStudioModel }) {
    const reviewRequiredId = useId();

    const {
        runForm,
        setRunForm,
        templateKeyOptions,
        documents,
        selectedDocumentIds,
        createRunMutation,
        notify,
        recentRuns,
    } = m;

    const isRunning = createRunMutation.isPending;

    const hasValidTemplate = templateKeyOptions.some(
        (template) => template.key === runForm.prompt_template_key,
    );

    function handleRun() {
        if (isRunning) {
            return;
        }

        const result = aiRunDraftSchema.safeParse(runForm);

        if (!result.success) {
            notify({
                message: firstSchemaError(result),
                severity: "error",
            });

            return;
        }

        if (!hasValidTemplate) {
            notify({
                message: "Select an available prompt template.",
                severity: "error",
            });

            return;
        }

        const topK = Number(result.data.top_k);

        if (!Number.isInteger(topK)) {
            notify({
                message: "Top K must be a whole number.",
                severity: "error",
            });

            return;
        }

        const availableDocumentIds = new Set(
            documents.map((document) => document.id),
        );

        const validDocumentIds = selectedDocumentIds.filter(
            (documentId) => availableDocumentIds.has(documentId),
        );

        createRunMutation.mutate({
            prompt_template_key: result.data.prompt_template_key,
            variables: parseJsonObject(result.data.variables_json),
            retrieval_query:
                result.data.retrieval_query.trim() || undefined,
            document_ids: validDocumentIds,
            top_k: topK,
            review_required: result.data.review_required,
        });
    }

    return (
        <SectionCard
            title="Run playground"
            description="Execute prompt versions with structured variables, retrieval context, and human-review routing."
        >
            <div className="flex min-w-0 flex-col gap-ui-lg">
                <form
                    className="flex min-w-0 flex-col ui-auto-run-playground-panel-form"
                    aria-busy={isRunning}
                    onSubmit={(event) => {
                        event.preventDefault();
                        handleRun();
                    }}
                >
                    <div className="grid min-w-0 ui-auto-run-playground-panel-div">
                        <FormField
                            as="select"
                            label="Prompt template"
                            value={runForm.prompt_template_key}
                            disabled={
                                isRunning ||
                                templateKeyOptions.length === 0
                            }
                            required
                            onChange={(event) => {
                                const value = event.currentTarget.value;

                                setRunForm((current) => ({
                                    ...current,
                                    prompt_template_key: value,
                                }));
                            }}
                        >
                            <option value="" disabled>
                                {templateKeyOptions.length > 0
                                    ? "Select a prompt template"
                                    : "No prompt templates available"}
                            </option>

                            {templateKeyOptions.map((template) => (
                                <option
                                    key={template.id}
                                    value={template.key}
                                >
                                    {template.name} ({template.key})
                                </option>
                            ))}
                        </FormField>

                        <FormField
                            type="number"
                            label="Top K chunks"
                            description="Number of retrieval chunks, between 1 and 20."
                            min={1}
                            max={20}
                            step={1}
                            required
                            disabled={isRunning}
                            value={runForm.top_k}
                            onChange={(event) => {
                                const value = event.currentTarget.value;

                                setRunForm((current) => ({
                                    ...current,
                                    top_k: value,
                                }));
                            }}
                        />
                    </div>

                    <FormField
                        as="textarea"
                        label="Variables JSON"
                        description="Provide prompt variables as a valid JSON object."
                        rows={8}
                        spellCheck={false}
                        disabled={isRunning}
                        value={runForm.variables_json}
                        className="ui-auto-run-playground-panel-form-field"
                        onChange={(event) => {
                            const value = event.currentTarget.value;

                            setRunForm((current) => ({
                                ...current,
                                variables_json: value,
                            }));
                        }}
                    />

                    <FormField
                        label="Retrieval query"
                        description="Optional search query for retrieving relevant document chunks."
                        placeholder="Enter a retrieval query..."
                        maxLength={4000}
                        disabled={isRunning}
                        value={runForm.retrieval_query}
                        onChange={(event) => {
                            const value = event.currentTarget.value;

                            setRunForm((current) => ({
                                ...current,
                                retrieval_query: value,
                            }));
                        }}
                    />

                    <RetrievalDocumentSelector m={m} />

                    <div className="flex items-start justify-between ui-auto-run-playground-panel-div-77ec16a">
                        <div className="min-w-0 space-y-ui-xxs">
                            <Label htmlFor={reviewRequiredId}>
                                Require human review
                            </Label>

                            <p
                                id={`${reviewRequiredId}-description`}
                                className="ui-auto-run-playground-panel-p"
                            >
                                Route the generated output for human review.
                            </p>
                        </div>

                        <Switch
                            id={reviewRequiredId}
                            checked={runForm.review_required}
                            disabled={isRunning}
                            aria-describedby={`${reviewRequiredId}-description`}
                            onCheckedChange={(checked) =>
                                setRunForm((current) => ({
                                    ...current,
                                    review_required: checked,
                                }))
                            }
                        />
                    </div>

                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            variant="default"
                            disabled={isRunning || !hasValidTemplate}
                            className="w-full sm:w-auto"
                        >
                            {isRunning ? (
                                <LoaderCircle
                                    className="ui-auto-run-playground-panel-loader-circle"
                                    aria-hidden="true"
                                />
                            ) : (
                                <PlayCircle
                                    className="ui-auto-run-playground-panel-play-circle"
                                    aria-hidden="true"
                                />
                            )}

                            {isRunning ? "Running..." : "Run prompt"}
                        </Button>
                    </div>
                </form>

                <section
                    aria-label="Recent AI runs"
                    className="flex min-w-0 flex-col ui-auto-run-playground-panel-section"
                >
                    <div className="flex flex-wrap items-center justify-between gap-ui-xs">
                        <h3 className="ui-auto-run-playground-panel-h3">
                            Recent runs
                        </h3>

                        <Badge variant="secondary">
                            {recentRuns.length}
                        </Badge>
                    </div>

                    {recentRuns.length > 0 ? (
                        <div className="grid min-w-0 ui-auto-run-playground-panel-div-e8a93d0">
                            {recentRuns.map((run) => (
                                <RecentRunCard
                                    key={run.id}
                                    m={m}
                                    run={run}
                                />
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon={<Sparkles />}
                            title="No AI runs yet"
                            description="Run a prompt version to capture outputs, token usage, and review state."
                        />
                    )}
                </section>
            </div>
        </SectionCard>
    );
}
