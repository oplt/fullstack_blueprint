import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { useMemoryWorkspace } from "./hooks/useMemoryWorkspace";
import { PageShell } from "../../components/ui/PageShell";
import { SettingsTabs } from "../../components/layout/SettingsTabs";
import { MemoryDetail } from "./MemoryDetail";
import { MemoryAuditPanel } from "./MemoryAuditPanel";
import { MemoryFiltersPanel } from "./MemoryFiltersPanel";
import { MemoryListPanel } from "./MemoryListPanel";


export default function MemoryView() {
    const workspace = useMemoryWorkspace();
    const {
        selectedId, confirmDelete, setConfirmDelete, forgetReason, setForgetReason,
        auditOffset, setAuditOffset, auditOpen, setAuditOpen, detailQuery, auditQuery,
        deleteMutation, pageSize,
    } = workspace;

    return (
        <PageShell width="wide">
            <SettingsTabs />

            <div className="flex gap-ui-md">
                <MemoryFiltersPanel workspace={workspace} />
                <MemoryListPanel workspace={workspace} />

                {selectedId ? (
                    <MemoryDetail
                        item={detailQuery.data ?? null}
                        isLoading={detailQuery.isLoading}
                        isError={detailQuery.isError}
                        error={detailQuery.error}
                        onRetry={() => void detailQuery.refetch()}
                        onForget={() => {
                            if (detailQuery.data) setConfirmDelete(detailQuery.data);
                        }}
                    />
                ) : null}

                <MemoryAuditPanel
                    isOpen={auditOpen}
                    onOpenChange={setAuditOpen}
                    query={auditQuery}
                    offset={auditOffset}
                    pageSize={pageSize}
                    onPageChange={(page) => setAuditOffset(page * pageSize)}
                />
            </div>

            <div>
                <div>Forget memory?</div>
                <div>
                    <div className="flex ui-auto-memory-view-div">
                        <div role="alert" className="ui-auto-memory-view-div-bac2659">
                            This permanently removes the memory item and records an audit entry.
                            It is separate from search/list browsing.
                        </div>
                        <p>{confirmDelete?.content}</p>
                        <FormField
                            label="Reason"
                            value={forgetReason}
                            onChange={(e: any) => setForgetReason(e.target.value)}
                            required
                            description="Required for forget audit trail" />
                    </div>
                </div>
                <div>
                    <Button onClick={() => setConfirmDelete(null)} type="button">Cancel</Button>
                    <Button
                        variant="destructive"
                        disabled={deleteMutation.isPending || forgetReason.trim().length < 3}
                        onClick={() => deleteMutation.mutate()}
                        type="button">
                        Forget
                    </Button>
                </div>
            </div>
        </PageShell>
    );
}
