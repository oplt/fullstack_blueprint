import { RunStatusPanel } from "@/components/ui/RunStatusPanel";
import type { RagIngestionJob } from "@/features/rag/api";

type Props = {
    job: RagIngestionJob;
    title: string;
    dense?: boolean;
    onRetry?: () => void;
    retryDisabled?: boolean;
};

export function RagIngestionStatus({ job, title, dense, onRetry, retryDisabled }: Props) {
    return (
        <RunStatusPanel
            dense={dense}
            title={title}
            status={job.status}
            runId={job.id}
            stage="parse → chunk → embed"
            startedAt={job.started_at}
            completedAt={job.finished_at}
            createdAt={job.created_at}
            errorMessage={job.error_message}
            onRetry={onRetry}
            retryLabel="Re-index"
            retryDisabled={retryDisabled}
        />
    );
}
