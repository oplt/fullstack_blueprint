import { notify } from "../../../lib/notify";
import { useQuery } from "@tanstack/react-query";
import { getAiOverview } from "../../../api/ai/overview";
import { listAiDatasetCases, listAiEvaluationRuns } from "../../../api/ai/evaluations";
import { listAiReviews } from "../../../api/ai/reviews";
import { listPromptVersions } from "../../../api/ai/prompts";
import { queryKeys } from "../../../config/queryKeys";
import { jobPollInterval, QUERY_STALE_TIMES } from "../../../config/queryTiming";
import { useAiStudioForms } from "./useAiStudioForms";
import { useAiPromptAssetMutations } from "./useAiPromptAssetMutations";
import { useAiRunEvaluationMutations } from "./useAiRunEvaluationMutations";
export function useAiStudioView() {
    const forms = useAiStudioForms();
    const { selectedTemplateId, selectedDatasetId } = forms;
    const {
        data: overview,
        isLoading,
        isError,
        error,
        refetch,
    } = useQuery({
        queryKey: queryKeys.ai.overview,
        queryFn: ({ signal }) => getAiOverview({ signal }),
        staleTime: QUERY_STALE_TIMES.aiOverview,
    });
    const {
        data: reviews = [],
        isLoading: reviewsLoading,
        isError: reviewsIsError,
        error: reviewsError,
        refetch: refetchReviews,
    } = useQuery({
        queryKey: queryKeys.ai.reviews,
        queryFn: ({ signal }) => listAiReviews({ signal }),
        staleTime: QUERY_STALE_TIMES.aiReviews,
    });
    const {
        data: evaluationRuns = [],
        isLoading: evaluationRunsLoading,
        isError: evaluationRunsIsError,
        error: evaluationRunsError,
        refetch: refetchEvaluationRuns,
    } = useQuery({
        queryKey: queryKeys.ai.evaluationRuns,
        queryFn: ({ signal }) => listAiEvaluationRuns({ signal }),
        staleTime: QUERY_STALE_TIMES.aiEvaluationRuns,
        refetchInterval: (query) => {
            const runs = query.state.data ?? [];
            const running = runs.filter((run) => run.status === "running");
            if (!running.length) return false;
            const starts = running.map((run) => Date.parse(run.created_at)).filter(Number.isFinite);
            const newestStart = starts.length ? Math.max(...starts) : Date.now();
            return jobPollInterval(Math.max(0, Date.now() - newestStart));
        },
        refetchIntervalInBackground: false,
    });

    const promptTemplates = overview?.prompt_templates ?? [];
    const documents = overview?.documents ?? [];
    const datasets = overview?.datasets ?? [];
    const recentRuns = overview?.recent_runs ?? [];
    const providers = overview?.providers ?? [];

    const {
        data: selectedTemplateVersions = [],
        isLoading: versionsLoading,
        isError: versionsIsError,
        error: versionsError,
        refetch: refetchVersions,
    } = useQuery({
        queryKey: queryKeys.ai.promptVersions(selectedTemplateId),
        queryFn: ({ signal }) => listPromptVersions(selectedTemplateId, { signal }),
        enabled: selectedTemplateId.length > 0,
        staleTime: QUERY_STALE_TIMES.aiPromptVersions,
    });
    const {
        data: selectedDatasetCases = [],
        isLoading: datasetCasesLoading,
        isError: datasetCasesIsError,
        error: datasetCasesError,
        refetch: refetchDatasetCases,
    } = useQuery({
        queryKey: queryKeys.ai.datasetCases(selectedDatasetId),
        queryFn: ({ signal }) => listAiDatasetCases(selectedDatasetId, { signal }),
        enabled: selectedDatasetId.length > 0,
        staleTime: QUERY_STALE_TIMES.aiDatasetCases,
    });

    const templateKeyOptions = promptTemplates.map((template) => ({
        id: template.id,
        key: template.key,
        name: template.name,
    }));

    const promptAssetMutations = useAiPromptAssetMutations(forms);
    const runEvaluationMutations = useAiRunEvaluationMutations(forms);

    return { overview, isLoading, isError, error, refetch, reviews, reviewsLoading, reviewsIsError, reviewsError, refetchReviews, evaluationRuns, evaluationRunsLoading, evaluationRunsIsError, evaluationRunsError, refetchEvaluationRuns,
        ...forms,
        promptTemplates, documents, datasets, recentRuns, providers, selectedTemplateVersions, versionsLoading, versionsIsError, versionsError, refetchVersions, selectedDatasetCases, datasetCasesLoading, datasetCasesIsError, datasetCasesError, refetchDatasetCases, templateKeyOptions,
        ...promptAssetMutations, ...runEvaluationMutations, notify };
}
export type AiStudioModel = ReturnType<typeof useAiStudioView>;
