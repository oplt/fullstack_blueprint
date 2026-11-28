import { AdvancedSettings } from "../../components/ui/AdvancedSettings";
import { JsonBlock } from "../../components/ui/JsonBlock";
import { KeyValueList } from "../../components/ui/KeyValueList";
import { QueryErrorAlert } from "../../components/ui/QueryBoundary";
import { recordToKeyValueItems } from "../../components/ui/jsonDisplay";
import { formatDateTime } from "@/lib/formatters";
import type { AiStudioModel } from "./useAiStudioView";

type Props = { model: AiStudioModel };

export function EvaluationResults({ model }: Props) {
    const { selectedDatasetId, datasetCasesIsError, datasetCasesError, refetchDatasetCases, datasetCasesLoading, selectedDatasetCases, evaluationRunsIsError, evaluationRunsError, refetchEvaluationRuns, evaluationRunsLoading, evaluationRuns } = model;
    return (
        <>
                    {selectedDatasetId && datasetCasesIsError && (
                        <QueryErrorAlert
                            error={datasetCasesError}
                            fallback="Failed to load dataset cases."
                            onRetry={() => void refetchDatasetCases()}
                        />
                    )}
                    {selectedDatasetId && datasetCasesLoading ? (
                        <div className="flex gap-ui-xs">
                            {Array.from({ length: 2 }).map((_: any, index: any) => (
                                <div
                                    key={index}
                                    className="animate-pulse rounded-md bg-muted" />
                            ))}
                        </div>
                    ) : selectedDatasetCases.length > 0 ? (
                        <div className="flex gap-ui-xs">
                            {selectedDatasetCases.map((item) => (
                                <div key={item.id} className="rounded-md border border-border p-ui-sm">
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
                        <div className="flex gap-ui-xs">
                            {Array.from({ length: 2 }).map((_: any, index: any) => (
                                <div
                                    key={index}

                                    className="animate-pulse rounded-md bg-muted rounded-md" />
                            ))}
                        </div>
                    ) : evaluationRuns.length > 0 ? (
                        <div className="flex gap-ui-xs">
                            {evaluationRuns.map((run) => (
                                <div
                                    key={run.id}
                                    role="alert"
                                    className="rounded-lg border border-border p-ui-sm text-body-md">
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
        </>
    );
}
