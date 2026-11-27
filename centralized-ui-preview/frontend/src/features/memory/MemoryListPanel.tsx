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
                                    <table className="w-full ui-auto-memory-list-panel-table">
                                        <thead>
                                            <tr className="ui-auto-memory-list-panel-tr">
                                                <td className="ui-auto-memory-list-panel-td">Content</td>
                                                <td className="ui-auto-memory-list-panel-td-a2ee7af">Level</td>
                                                <td className="ui-auto-memory-list-panel-td-a2ee7af-x">Privacy</td>
                                                <td className="ui-auto-memory-list-panel-td-a2ee7af-x-x">Confidence</td>
                                                <td className="ui-auto-memory-list-panel-td-a2ee7af-x-x-x">Updated</td>
                                                <td align="right" className="ui-auto-memory-list-panel-td-a2ee7af-x-x-x-x">Actions</td>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {displayItems.map((item) => (
                                                <tr
                                                    key={item.id}
                                                    onClick={() => setSelectedId(item.id)}
                                                    style={{ cursor: "pointer" }}
                                                    className="ui-auto-memory-list-panel-tr-6ff2f8b">
                                                    <td style={{ maxWidth: 360 }} className="ui-auto-memory-list-panel-td-a2ee7af-x-x-x-x-x">
                                                        <p>
                                                            {item.content}
                                                        </p>
                                                    </td>
                                                    <td className="ui-auto-memory-list-panel-td-a2ee7af-x-x-x-x-x-x">
                                                        <div
                                                            className="inline-flex items-center ui-auto-memory-list-panel-div" />
                                                    </td>
                                                    <td className="ui-auto-memory-list-panel-td-a2ee7af-x-x-x-x-x-x-x">{item.metadata.privacy}</td>
                                                    <td className="ui-auto-memory-list-panel-td-a2ee7af-x-x-x-x-x-x-x-x">
                                                        {item.metadata.confidence.toFixed(2)}
                                                    </td>
                                                    <td className="ui-auto-memory-list-panel-td-a2ee7af-x-x-x-x-x-x-x-x-x">
                                                        {item.updated_at
                                                            ? new Date(item.updated_at).toLocaleString()
                                                            : "—"}
                                                    </td>
                                                    <td align="right" className="ui-auto-memory-list-panel-td-a2ee7af-x-x-x-x-x-x-x-x-x-x">
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
