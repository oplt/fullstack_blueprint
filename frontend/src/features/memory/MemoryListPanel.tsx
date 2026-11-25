import { Button } from "@/components/ui/button";
import { Brain as MemoryIcon, Trash2 as DeleteIcon } from "lucide-react";
import { EmptyState } from "../../components/ui/EmptyState";
import { QueryBoundary, QueryErrorAlert } from "../../components/ui/QueryBoundary";
import { SectionCard } from "../../components/ui/SectionCard";
import { PaginationControls } from "../../components/ui/pagination";
import type { useMemoryWorkspace } from "./hooks/useMemoryWorkspace";

type Workspace = ReturnType<typeof useMemoryWorkspace>;
type Props = { workspace: Workspace };

export function MemoryListPanel({ workspace }: Props) {
    const { listQuery, searchResults, displayItems, setSelectedId, setConfirmDelete, offset, pageSize, setOffset } = workspace;
    return (
                <SectionCard title="Memory list" description="Browse or search results. Destructive actions require confirmation.">
                    {listQuery.isError && !searchResults ? (
                        <QueryErrorAlert
                            error={listQuery.error}
                            fallback="Failed to load memories. Memory service may be disabled."
                            onRetry={() => void listQuery.refetch()}
                        />
                    ) : (
                        <QueryBoundary
                            isLoading={listQuery.isLoading && !searchResults}
                            isError={false}
                        >
                            {displayItems.length === 0 ? (
                                <EmptyState
                                    icon={<MemoryIcon />}
                                    title="No memories"
                                    description="Adjust filters or run an agent that writes memory."
                                />
                            ) : (
                                <div className="min-w-0 max-w-full overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border">
                                                <td className="p-2 align-top">Content</td>
                                                <td className="p-2 align-top">Level</td>
                                                <td className="p-2 align-top">Privacy</td>
                                                <td className="p-2 align-top">Confidence</td>
                                                <td className="p-2 align-top">Updated</td>
                                                <td align="right" className="p-2 align-top">Actions</td>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {displayItems.map((item) => (
                                                <tr
                                                    key={item.id}
                                                    onClick={() => setSelectedId(item.id)}
                                                    style={{ cursor: "pointer" }}
                                                    className="border-b border-border">
                                                    <td style={{ maxWidth: 360 }} className="p-2 align-top">
                                                        <p>
                                                            {item.content}
                                                        </p>
                                                    </td>
                                                    <td className="p-2 align-top">
                                                        <div
                                                            className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />
                                                    </td>
                                                    <td className="p-2 align-top">{item.metadata.privacy}</td>
                                                    <td className="p-2 align-top">
                                                        {item.metadata.confidence.toFixed(2)}
                                                    </td>
                                                    <td className="p-2 align-top">
                                                        {item.updated_at
                                                            ? new Date(item.updated_at).toLocaleString()
                                                            : "—"}
                                                    </td>
                                                    <td align="right" className="p-2 align-top">
                                                        <Button
                                                            variant="destructive"
                                                            onClick={(e: any) => {
                                                                e.stopPropagation();
                                                                setConfirmDelete(item);
                                                            }}
                                                            type="button"><DeleteIcon />Forget
                                                                                                                    </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            {!searchResults ? (
                                <PaginationControls count={listQuery.data?.total ?? 0} page={Math.floor(offset / pageSize)} rowsPerPage={pageSize} onPageChange={(page) => setOffset(page * pageSize)} />
                            ) : null}
                        </QueryBoundary>
                    )}
                </SectionCard>
    );
}
