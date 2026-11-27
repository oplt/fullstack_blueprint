import { PaginationControls } from "../../components/ui/pagination";
import { QueryBoundary } from "../../components/ui/QueryBoundary";
import { SectionCard } from "../../components/ui/SectionCard";
import type { useMemoryWorkspace } from "./hooks/useMemoryWorkspace";

type MemoryAuditPanelProps = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    query: ReturnType<typeof useMemoryWorkspace>["auditQuery"];
    offset: number;
    pageSize: number;
    onPageChange: (page: number) => void;
};

export function MemoryAuditPanel({
    isOpen,
    onOpenChange,
    query,
    offset,
    pageSize,
    onPageChange,
}: MemoryAuditPanelProps) {
    return (
        <SectionCard title="Audit history" description="Remember / forget operations for your account.">
            <details
                open={isOpen}
                onToggle={(event) => onOpenChange(event.currentTarget.open)}
            >
                <summary className="ui-auto-memory-audit-panel-summary">Show audit history</summary>
                {isOpen ? (
                    <QueryBoundary
                        isLoading={query.isLoading}
                        isError={query.isError}
                        error={query.error}
                        onRetry={() => void query.refetch()}
                    >
                        <div className="min-w-0 max-w-full overflow-x-auto">
                            <table className="w-full ui-auto-memory-audit-panel-table">
                                <thead>
                                    <tr className="ui-auto-memory-audit-panel-tr">
                                        <th scope="col" className="ui-auto-memory-audit-panel-th">Operation</th>
                                        <th scope="col" className="ui-auto-memory-audit-panel-th-038878e">Level</th>
                                        <th scope="col" className="ui-auto-memory-audit-panel-th-038878e-x">Agent</th>
                                        <th scope="col" className="ui-auto-memory-audit-panel-th-038878e-x-x">Source ref</th>
                                        <th scope="col" className="ui-auto-memory-audit-panel-th-038878e-x-x-x">When</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(query.data?.items ?? []).map((log) => (
                                        <tr key={log.id} className="ui-auto-memory-audit-panel-tr-6ff2f8b">
                                            <td className="p-ui-xs">{log.operation}</td>
                                            <td className="p-ui-xs">{log.memory_level ?? "—"}</td>
                                            <td className="p-ui-xs">{log.agent_id ?? "—"}</td>
                                            <td className="p-ui-xs">{log.source_ref ?? "—"}</td>
                                            <td className="p-ui-xs">
                                                {new Date(log.created_at).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <PaginationControls
                            count={query.data?.total ?? 0}
                            page={Math.floor(offset / pageSize)}
                            rowsPerPage={pageSize}
                            onPageChange={onPageChange}
                        />
                    </QueryBoundary>
                ) : null}
            </details>
        </SectionCard>
    );
}
