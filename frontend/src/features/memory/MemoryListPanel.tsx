import {Button} from "@/components/ui/button";
import {Brain, Trash2} from "lucide-react";
import {EmptyState} from "../../components/Feedback";
import {QueryBoundary, QueryErrorAlert} from "../../components/ui/QueryBoundary";
import {SectionCard} from "../../components/Section";
import {PaginationControls} from "../../components/ui/pagination";
import type {useMemoryWorkspace} from "./useMemoryWorkspace";
import {Badge} from "@/components/ui/badge";

type Workspace = ReturnType<typeof useMemoryWorkspace>;
type Props = { workspace: Workspace };

export function MemoryListPanel({workspace}: Props) {
    const {
        listQuery,
        searchResults,
        displayItems,
        setSelectedId,
        setConfirmDelete,
        offset,
        pageSize,
        setOffset
    } = workspace;
    return (
        <SectionCard title="Memory list"
                     description="Browse or search results. Destructive actions require confirmation.">
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
                            icon={<Brain/>}
                            title="No memories"
                            description="Adjust filters or run an agent that writes memory."
                        />
                    ) : (
                        <div className="min-w-0 max-w-full overflow-x-auto">
                            <table className="w-full text-body-md">
                                <thead>
                                <tr className="border-b border-border">
                                    <td className="p-ui-xs align-top">Content</td>
                                    <td className="p-ui-xs align-top">Level</td>
                                    <td className="p-ui-xs align-top">Privacy</td>
                                    <td className="p-ui-xs align-top">Confidence</td>
                                    <td className="p-ui-xs align-top">Updated</td>
                                    <td align="right" className="p-ui-xs align-top">Actions</td>
                                </tr>
                                </thead>
                                <tbody>
                                {displayItems.map((item) => (
                                    <tr
                                        key={item.id}
                                        onClick={() => setSelectedId(item.id)}
                                        className="cursor-pointer border-b border-border">
                                        <td className="ui-table-long-text p-ui-xs align-top">
                                            <p>
                                                {item.content}
                                            </p>
                                        </td>
                                        <td className="p-ui-xs align-top">
                                            <Badge variant="secondary">
                                                {item.metadata.memory_level}
                                            </Badge>
                                        </td>
                                        <td className="p-ui-xs align-top">{item.metadata.privacy}</td>
                                        <td className="p-ui-xs align-top">
                                            {item.metadata.confidence.toFixed(2)}
                                        </td>
                                        <td className="p-ui-xs align-top">
                                            {item.updated_at
                                                ? new Date(item.updated_at).toLocaleString()
                                                : "—"}
                                        </td>
                                        <td align="right" className="p-ui-xs align-top">
                                            <Button
                                                variant="destructive"
                                                onClick={(e: any) => {
                                                    e.stopPropagation();
                                                    setConfirmDelete(item);
                                                }}
                                                type="button"><Trash2/>Forget
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {!searchResults ? (
                        <PaginationControls count={listQuery.data?.total ?? 0} page={Math.floor(offset / pageSize)}
                                            rowsPerPage={pageSize} onPageChange={(page) => setOffset(page * pageSize)}/>
                    ) : null}
                </QueryBoundary>
            )}
        </SectionCard>
    );
}
