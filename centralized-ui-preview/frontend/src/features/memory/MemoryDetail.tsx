import { Button } from "@/components/ui/button";import { Trash2 as DeleteIcon } from "lucide-react";
import { QueryBoundary } from "../../components/ui/QueryBoundary";
import { SectionCard } from "../../components/ui/SectionCard";
import type { MemoryItem } from "../../api/memory";

type MemoryDetailProps = {
    item: MemoryItem | null;
    isLoading: boolean;
    isError: boolean;
    error: unknown;
    onRetry: () => void;
    onForget: () => void;
};

export function MemoryDetail({
    item,
    isLoading,
    isError,
    error,
    onRetry,
    onForget,
}: MemoryDetailProps) {
    return (
        <SectionCard
            title="Memory detail"
            description="Source, confidence, privacy, and timestamps."
            action={
                <Button variant="destructive" disabled={!item} onClick={onForget} type="button"><DeleteIcon />Forget
                                    </Button>
            }
        >
            <QueryBoundary
                isLoading={isLoading}
                isError={isError}
                error={error}
                onRetry={onRetry}
            >
                {!item ? (
                    <p className="text-muted-foreground">
                        Select a memory to inspect.
                    </p>
                ) : (
                    <div className="flex gap-ui-sm">
                        <p>{item.content}</p>
                        <div className="flex flex-row flex-wrap gap-ui-xs">
                            <div
                                className="inline-flex items-center ui-auto-memory-detail-div" />
                            <div
                                className="inline-flex items-center ui-auto-memory-detail-div-7c6ee7c" />
                            <div
                                className="inline-flex items-center ui-auto-memory-detail-div-7c6ee7c-x" />
                            <div
                                className="inline-flex items-center ui-auto-memory-detail-div-7c6ee7c-x-x" />
                        </div>
                        <div>
                            <span className="text-muted-foreground">
                                Source: {item.metadata.source}
                                {item.metadata.source_ref
                                    ? ` · ${item.metadata.source_ref}`
                                    : ""}
                            </span>
                            <span className="text-muted-foreground">
                                Agent: {item.metadata.agent_id}
                                {item.metadata.project_id
                                    ? ` · project ${item.metadata.project_id}`
                                    : ""}
                                {item.metadata.run_id ? ` · run ${item.metadata.run_id}` : ""}
                            </span>
                            <span className="text-muted-foreground">
                                Created:{" "}
                                {item.metadata.created_at
                                    ? new Date(item.metadata.created_at).toLocaleString()
                                    : "—"}
                            </span>
                            <span className="text-muted-foreground">
                                Last seen:{" "}
                                {item.metadata.last_seen_at
                                    ? new Date(item.metadata.last_seen_at).toLocaleString()
                                    : "—"}
                            </span>
                            <span className="text-muted-foreground">
                                Last confirmed:{" "}
                                {item.metadata.last_confirmed_at
                                    ? new Date(item.metadata.last_confirmed_at).toLocaleString()
                                    : "—"}
                            </span>
                        </div>
                        {item.score != null ? (
                            <div role="alert" className="ui-auto-memory-detail-div-bac2659">Search score: {item.score.toFixed(3)}</div>
                        ) : null}
                    </div>
                )}
            </QueryBoundary>
        </SectionCard>
    );
}
