import {Button} from "@/components/ui/button";
import {Trash2} from "lucide-react";
import {QueryBoundary} from "../../components/ui/QueryBoundary";
import {SectionCard} from "../../components/Section";
import type {MemoryItem} from "@/features/memory/api";
import {Badge} from "@/components/ui/badge";

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
                <Button variant="destructive" disabled={!item} onClick={onForget} type="button"><Trash2/>Forget
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
                        <div className="flex flex-wrap gap-ui-xs">
                            <Badge variant="secondary">
                                {item.metadata.memory_level}
                            </Badge>

                            <Badge variant="outline">
                                {item.metadata.memory_type}
                            </Badge>

                            <Badge variant="outline">
                                {item.metadata.privacy}
                            </Badge>

                            <Badge variant="outline">
                                confidence {item.metadata.confidence.toFixed(2)}
                            </Badge>
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
                            <div role="alert" className="rounded-lg border border-border p-ui-sm text-body-md">Search
                                score: {item.score.toFixed(3)}</div>
                        ) : null}
                    </div>
                )}
            </QueryBoundary>
        </SectionCard>
    );
}
