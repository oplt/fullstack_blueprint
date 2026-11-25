import { notify } from "../../../lib/notify";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAiDataset, createAiDatasetCase, runAiEvaluation } from "../../../api/ai/evaluations";
import { createAiFeedback, createAiRun } from "../../../api/ai/runs";
import { createAiReview, decideAiReview } from "../../../api/ai/reviews";
import { invalidateAiOverview, queryKeys } from "../../../config/queryKeys";
import { useMutationErrorToast } from "../../../hooks/useMutationErrorToast";
import type { AiStudioForms } from "./useAiStudioForms";

export function useAiRunEvaluationMutations(forms: AiStudioForms) {
    const client = useQueryClient();
    const toastError = useMutationErrorToast();
    const createRunMutation = useMutation({ mutationFn: createAiRun,
        onSuccess: async () => { await invalidateAiOverview(client); await client.invalidateQueries({ queryKey: queryKeys.ai.reviews }); notify({ message: "AI run completed.", severity: "success" }); },
        onError: (error) => toastError(error, "Failed to run prompt.") });
    const createReviewMutation = useMutation({ mutationFn: (runId: string) => createAiReview(runId),
        onSuccess: async () => { await client.invalidateQueries({ queryKey: queryKeys.ai.reviews }); notify({ message: "Review requested.", severity: "success" }); },
        onError: (error) => toastError(error, "Failed to create review.") });
    const decideReviewMutation = useMutation({
        mutationFn: ({ reviewId, status, reviewer_notes, corrected_output }: { reviewId: string; status: "approved" | "rejected" | "changes_requested"; reviewer_notes?: string; corrected_output?: string }) => decideAiReview(reviewId, { status, reviewer_notes, corrected_output }),
        onSuccess: async () => { await client.invalidateQueries({ queryKey: queryKeys.ai.reviews }); notify({ message: "Review decision saved.", severity: "success" }); },
        onError: (error) => toastError(error, "Failed to save review decision."),
    });
    const createFeedbackMutation = useMutation({
        mutationFn: ({ runId, rating, comment, corrected_output }: { runId: string; rating: -1 | 1; comment?: string; corrected_output?: string }) => createAiFeedback(runId, { rating, comment, corrected_output }),
        onSuccess: () => notify({ message: "Feedback saved.", severity: "success" }),
        onError: (error) => toastError(error, "Failed to save feedback."),
    });
    const createDatasetMutation = useMutation({ mutationFn: createAiDataset,
        onSuccess: async (dataset) => { forms.setDatasetForm({ name: "", description: "" }); forms.setSelectedDatasetId(dataset.id); await invalidateAiOverview(client); notify({ message: "Evaluation dataset created.", severity: "success" }); },
        onError: (error) => toastError(error, "Failed to create evaluation dataset.") });
    const createDatasetCaseMutation = useMutation({
        mutationFn: ({ datasetId, payload }: { datasetId: string; payload: Parameters<typeof createAiDatasetCase>[1] }) => createAiDatasetCase(datasetId, payload),
        onSuccess: async () => { forms.setSelectedEvaluationDocumentIds([]); await client.invalidateQueries({ queryKey: queryKeys.ai.datasetCases(forms.selectedDatasetId) }); notify({ message: "Evaluation case added.", severity: "success" }); },
        onError: (error) => toastError(error, "Failed to add evaluation case."),
    });
    const runEvaluationMutation = useMutation({
        mutationFn: ({ datasetId, promptVersionId }: { datasetId: string; promptVersionId: string }) => runAiEvaluation(datasetId, promptVersionId),
        onSuccess: async () => { await client.invalidateQueries({ queryKey: queryKeys.ai.evaluationRuns }); notify({ message: "Evaluation started. Results will update when complete.", severity: "success" }); },
        onError: (error) => toastError(error, "Failed to run evaluation."),
    });
    return { createRunMutation, createReviewMutation, decideReviewMutation,
        createFeedbackMutation, createDatasetMutation, createDatasetCaseMutation,
        runEvaluationMutation };
}
