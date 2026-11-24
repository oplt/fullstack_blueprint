import { Button } from "@/components/ui/button";import { DeleteOutline as DeleteIcon } from "@/components/ui/iconsCompat";
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
                    <div className="flex gap-[12px]">
                        <p>{item.content}</p>
                        <div className="flex flex-row gap-[8px] flex-wrap">
                            <div
                                className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />
                            <div
                                className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />
                            <div
                                className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />
                            <div
                                className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />
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
                            <div role="alert" className="rounded-lg border border-border p-3 text-sm">Search score: {item.score.toFixed(3)}</div>
                        ) : null}
                    </div>
                )}
            </QueryBoundary>
        </SectionCard>
    );
}
