import { PaginationControls } from "../../../components/ui/pagination";
import { QueryBoundary } from "../../../components/ui/QueryBoundary";
import { SectionCard } from "../../../components/ui/SectionCard";
import { PAGE_SIZE } from "../hooks/useRagWorkspace";
import type { useRagWorkspace } from "../hooks/useRagWorkspace";
type Workspace = ReturnType<typeof useRagWorkspace>;
type Props = { workspace: Workspace };

export function RagChunksPanel({ workspace }: Props) {
    return (
                                <SectionCard
                                    title="Chunks"
                                    description="Browse indexed segments for this document."
                                >
                                    <QueryBoundary
                                        isLoading={workspace.chunksQuery.isLoading}
                                        isError={workspace.chunksQuery.isError}
                                        error={workspace.chunksQuery.error}
                                        onRetry={() => void workspace.chunksQuery.refetch()}
                                    >
                                        {(workspace.chunksQuery.data?.items ?? []).length === 0 ? (
                                            <p className="text-muted-foreground">
                                                No chunks yet — wait for indexing or re-index.
                                            </p>
                                        ) : (
                                            (workspace.chunksQuery.data?.items ?? []).map((chunk) => (
                                                <div
                                                    className="border-border"
                                                    key={chunk.id}
                                                    style={{
                                                        paddingBlock: 8,
                                                        borderBottom: 1,
                                                    }}
                                                >
                                                    <span className="text-muted-foreground">
                                                        #{chunk.chunk_index} · {chunk.token_count}{" "}
                                                        tokens
                                                    </span>
                                                    <p>
                                                        {chunk.content}
                                                    </p>
                                                </div>
                                            ))
                                        )}
                                        <PaginationControls count={workspace.chunksQuery.data?.total ?? 0} page={Math.floor(workspace.chunkOffset / PAGE_SIZE)} rowsPerPage={PAGE_SIZE} onPageChange={(page) => workspace.setChunkOffset(page * PAGE_SIZE)} />
                                    </QueryBoundary>
                                </SectionCard>
    );
}
