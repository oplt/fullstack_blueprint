import {QueryBoundary} from "../../components/ui/QueryBoundary";
import {SectionCard} from "../../components/ui/SectionCard";
import {PaginationControls} from "../../components/ui/pagination";
import {PAGE_SIZE} from "./useRagWorkspace";
import type {useRagWorkspace} from "./useRagWorkspace";
import {Badge} from "@/components/ui/badge";

type RagWorkspace = ReturnType<typeof useRagWorkspace>;
type Props = { workspace: RagWorkspace };

export function RagRunsPanel({workspace}: Props) {
    return (

        <SectionCard
            title="Runs"
            description="Recent RAG asks with timestamp, model, scope, status, and duration."
        >
            <QueryBoundary
                isLoading={workspace.historyQuery.isLoading}
                isError={workspace.historyQuery.isError}
                error={workspace.historyQuery.error}
                onRetry={() => void workspace.historyQuery.refetch()}
            >
                <div className="min-w-0 max-w-full overflow-x-auto">
                    <table className="w-full text-body-md">
                        <thead>
                        <tr className="border-b border-border">
                            <td className="p-ui-xs align-top">Timestamp</td>
                            <td className="p-ui-xs align-top">Query</td>
                            <td className="p-ui-xs align-top">Model</td>
                            <td className="p-ui-xs align-top">Project / index</td>
                            <td className="p-ui-xs align-top">Status</td>
                            <td className="p-ui-xs align-top">Duration</td>
                        </tr>
                        </thead>
                        <tbody>
                        {(workspace.historyQuery.data?.items ?? []).map((item) => (
                            <tr key={item.id} className="border-b border-border">
                                <td className="p-ui-xs align-top">
                                    {new Date(item.created_at).toLocaleString()}
                                </td>
                                <td className="ui-table-long-text p-ui-xs align-top">
                                    {item.query}
                                </td>
                                <td className="p-ui-xs align-top">{item.model_name}</td>
                                <td className="p-ui-xs align-top">
                                    {item.project_id
                                        ? workspace.projectNameById.get(item.project_id) ??
                                        item.project_id.slice(0, 8)
                                        : "All / default"}
                                </td>
                                <td className="p-ui-xs align-top">
                                    <Badge
                                        variant={item.answer?.trim() ? "success" : "warning"}
                                    >
                                        {item.answer?.trim() ? "completed" : "empty answer"}
                                    </Badge>
                                </td>
                                <td className="p-ui-xs align-top">{item.latency_ms} ms</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
                <PaginationControls count={workspace.historyQuery.data?.total ?? 0}
                                    page={Math.floor(workspace.historyOffset / PAGE_SIZE)} rowsPerPage={PAGE_SIZE}
                                    onPageChange={(page) => workspace.setHistoryOffset(page * PAGE_SIZE)}/>
            </QueryBoundary>
        </SectionCard>

    );
}
