import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogClose,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    CloudUpload as UploadIcon,
    RefreshCw as RetryIcon,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { HelpTooltip } from "../../../components/ui/HelpTooltip";
import { QueryBoundary, QueryErrorAlert } from "../../../components/ui/QueryBoundary";
import { AdvancedDataTable } from "../../../components/ui/AdvancedDataTable";
import { TruncatedCell } from "../../../components/ui/TruncatedCell";
import { RunStatusBadge } from "../../../components/ui/RunStatusBadge";
import { RagIngestionStatus } from "./RagIngestionStatus";
import { SectionCard } from "../../../components/ui/SectionCard";
import {
    documentPipelineLabel,
} from "../ragEvaluationSummary";
import type { RefObject } from "react";
import type { useRagWorkspace } from "../hooks/useRagWorkspace";
import { PAGE_SIZE } from "../hooks/useRagWorkspace";

type RagWorkspace = ReturnType<typeof useRagWorkspace>;
type Props = { workspace: RagWorkspace; fileInputRef: RefObject<HTMLInputElement | null>; onTabChange: (tab: "documents" | "indexing" | "retrieval" | "evaluation" | "runs") => void };

export function ConfirmDeleteDocument({ disabled, onConfirm }: { disabled: boolean; onConfirm: () => void }) {
    return (
        <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" disabled={disabled} type="button" />}>
                Delete
            </AlertDialogTrigger>
            <AlertDialogContent>
                <div className="space-y-2">
                    <AlertDialogTitle>Delete this RAG document?</AlertDialogTitle>
                    <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                </div>
                <div className="flex justify-end gap-2">
                    <AlertDialogClose render={<Button variant="outline" type="button" />}>
                        Cancel
                    </AlertDialogClose>
                    <AlertDialogClose render={<Button variant="destructive" onClick={onConfirm} type="button" />}>
                        Delete document
                    </AlertDialogClose>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export function RagDocumentsPanel({ workspace, fileInputRef, onTabChange }: Props) {
    const selectedDocumentId = workspace.selectedDocumentId;
    return (
                
                    <SectionCard
                        title="Documents"
                        description="Upload sources and monitor parsing + indexing state before retrieval."
                        action={
                            <>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    hidden
                                    onChange={(e: any) => {
                                        const file = e.target.files?.[0];
                                        if (file) workspace.uploadMutation.mutate(file);
                                        e.target.value = "";
                                    }}
                                />
                                <Button
                                    variant="default"
                                    disabled={workspace.uploadMutation.isPending}
                                    onClick={() => fileInputRef.current?.click()}
                                    type="button"><UploadIcon />Upload
                                                                    </Button>
                            </>
                        }
                    >
                        {workspace.documentsQuery.isError ? (
                            <QueryErrorAlert
                                error={workspace.documentsQuery.error}
                                fallback="Failed to load RAG documents. RAG may be disabled."
                                onRetry={() => void workspace.documentsQuery.refetch()}
                            />
                        ) : (
                            <QueryBoundary isLoading={workspace.documentsQuery.isLoading} isError={false}>
                                <AdvancedDataTable
                                    ariaLabel="RAG documents"
                                    columns={[
                                        {
                                            id: "document",
                                            header: "Document",
                                            accessorFn: (doc) => doc.original_filename || doc.filename,
                                            cell: (info) => <TruncatedCell maxChars={48}>{String(info.getValue())}</TruncatedCell>,
                                        },
                                        {
                                            id: "parsing",
                                            header: () => (
                                                <HelpTooltip
                                                    termId="parsing_state"
                                                    variant="label"
                                                >
                                                    Parsing
                                                </HelpTooltip>
                                            ),
                                            accessorFn: (doc) => documentPipelineLabel(doc.status).parsing,
                                        },
                                        {
                                            id: "indexing",
                                            header: () => (
                                                <HelpTooltip
                                                    termId="indexing_state"
                                                    variant="label"
                                                >
                                                    Indexing
                                                </HelpTooltip>
                                            ),
                                            accessorFn: (doc) => documentPipelineLabel(doc.status).indexing,
                                        },
                                        {
                                            id: "status",
                                            header: "Status",
                                            accessorFn: (doc) => doc.status,
                                            cell: ({ row }) => <RunStatusBadge status={row.original.status} showRaw />,
                                        },
                                        {
                                            id: "updated",
                                            header: "Updated",
                                            accessorFn: (doc) => new Date(doc.updated_at).toLocaleString(),
                                        },
                                        {
                                            id: "actions",
                                            header: "Actions",
                                            enableHiding: false,
                                            cell: ({ row }) => (
                                                <div className="flex flex-row justify-end gap-1">
                                                    <Button
                                                        disabled={workspace.indexMutation.isPending}
                                                        onClick={() => workspace.indexMutation.mutate(row.original.id)}
                                                        type="button"><RetryIcon />Re-index</Button>
                                                    <ConfirmDeleteDocument
                                                        disabled={workspace.deleteMutation.isPending}
                                                        onConfirm={() => workspace.deleteMutation.mutate(row.original.id)}
                                                    />
                                                </div>
                                            ),
                                        },
                                    ] satisfies ColumnDef<(typeof workspace.documents)[number], unknown>[]}
                                    data={workspace.documents}
                                    getRowId={(doc) => doc.id}
                                    showDensityToggle
                                    enableColumnVisibility
                                    stickyHeader
                                    stickyFirstColumn
                                    enableSorting={false}
                                    searchable={false}
                                    manualPagination
                                    pageCount={Math.ceil((workspace.documentsQuery.data?.total ?? 0) / PAGE_SIZE)}
                                    pagination={{ pageIndex: Math.floor(workspace.docOffset / PAGE_SIZE), pageSize: PAGE_SIZE }}
                                    onPaginationChange={(pagination) => workspace.setDocOffset(pagination.pageIndex * PAGE_SIZE)}
                                    pageSizeOptions={[PAGE_SIZE]}
                                    selectedRowId={workspace.selectedDocumentId}
                                    onRowClick={(doc) => {
                                        workspace.setSelectedDocumentId(doc.id);
                                        workspace.setChunkOffset(0);
                                        onTabChange("indexing");
                                    }}
                                    emptyIcon={<UploadIcon />}
                                    emptyTitle="No RAG documents"
                                    emptyDescription="Upload a file to start parsing, chunking, and indexing."
                                />
                            </QueryBoundary>
                        )}
                        {workspace.pollJobId && workspace.jobQuery.data ? (
                            <div className="mt-2" >
                                <RagIngestionStatus
                                    dense
                                    title="Ingestion job"
                                    job={workspace.jobQuery.data}
                                    onRetry={
                                        selectedDocumentId
                                            ? () => workspace.indexMutation.mutate(selectedDocumentId)
                                            : undefined
                                    }
                                    retryDisabled={workspace.indexMutation.isPending}
                                />
                            </div>
                        ) : null}
                    </SectionCard>
                
    );
}
