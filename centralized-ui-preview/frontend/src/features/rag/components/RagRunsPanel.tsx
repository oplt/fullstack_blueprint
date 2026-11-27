import { QueryBoundary } from "../../../components/ui/QueryBoundary";
import { SectionCard } from "../../../components/ui/SectionCard";
import { PaginationControls } from "../../../components/ui/pagination";
import { PAGE_SIZE } from "../hooks/useRagWorkspace";
import type { useRagWorkspace } from "../hooks/useRagWorkspace";

type RagWorkspace = ReturnType<typeof useRagWorkspace>;
type Props = { workspace: RagWorkspace };

export function RagRunsPanel({ workspace }: Props) {
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
                                <table className="w-full ui-auto-rag-runs-panel-table">
                                    <thead>
                                        <tr className="ui-auto-rag-runs-panel-tr">
                                            <td className="ui-auto-rag-runs-panel-td">Timestamp</td>
                                            <td className="ui-auto-rag-runs-panel-td-a2ee7af">Query</td>
                                            <td className="ui-auto-rag-runs-panel-td-a2ee7af-x">Model</td>
                                            <td className="ui-auto-rag-runs-panel-td-a2ee7af-x-x">Project / index</td>
                                            <td className="ui-auto-rag-runs-panel-td-a2ee7af-x-x-x">Status</td>
                                            <td className="ui-auto-rag-runs-panel-td-a2ee7af-x-x-x-x">Duration</td>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(workspace.historyQuery.data?.items ?? []).map((item) => (
                                            <tr key={item.id} className="ui-auto-rag-runs-panel-tr-6ff2f8b">
                                                <td className="ui-auto-rag-runs-panel-td-a2ee7af-x-x-x-x-x">
                                                    {new Date(item.created_at).toLocaleString()}
                                                </td>
                                                <td style={{ maxWidth: 320 }} className="ui-auto-rag-runs-panel-td-a2ee7af-x-x-x-x-x-x">
                                                    {item.query}
                                                </td>
                                                <td className="ui-auto-rag-runs-panel-td-a2ee7af-x-x-x-x-x-x-x">{item.model_name}</td>
                                                <td className="ui-auto-rag-runs-panel-td-a2ee7af-x-x-x-x-x-x-x-x">
                                                    {item.project_id
                                                        ? workspace.projectNameById.get(item.project_id) ??
                                                          item.project_id.slice(0, 8)
                                                        : "All / default"}
                                                </td>
                                                <td className="ui-auto-rag-runs-panel-td-a2ee7af-x-x-x-x-x-x-x-x-x">
                                                    <div
                                                        className="inline-flex items-center ui-auto-rag-runs-panel-div" />
                                                </td>
                                                <td className="ui-auto-rag-runs-panel-td-a2ee7af-x-x-x-x-x-x-x-x-x-x">{item.latency_ms} ms</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <PaginationControls count={workspace.historyQuery.data?.total ?? 0} page={Math.floor(workspace.historyOffset / PAGE_SIZE)} rowsPerPage={PAGE_SIZE} onPageChange={(page) => workspace.setHistoryOffset(page * PAGE_SIZE)} />
                        </QueryBoundary>
                    </SectionCard>
                
    );
}
