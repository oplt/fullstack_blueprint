import { Button } from "@/components/ui/button";import { FormField } from "@/components/ui/form-field";import { useMemo, useState } from "react";
import {
    Trash2 as DeleteIcon,
    Brain as MemoryIcon,
    Search as SearchIcon,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "../../app/snackbarContext";
import { listProjects } from "../../api/projects";
import {
    deleteMemory,
    forgetMemory,
    getMemory,
    listMemories,
    listMemoryAuditLogs,
    searchMemories,
    type MemoryItem,
} from "../../api/memory";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageShell } from "../../components/ui/PageShell";
import { QueryBoundary, QueryErrorAlert } from "../../components/ui/QueryBoundary";
import { SectionCard } from "../../components/ui/SectionCard";
import { SettingsTabs } from "../../components/layout/SettingsTabs";
import { queryKeys } from "../../config/queryKeys";
import { PaginationControls } from "../../components/ui/pagination";
import { getQueryErrorMessage } from "../../utils/queryErrors";
import { MemoryDetail } from "./MemoryDetail";

const PAGE_SIZE = 20;
const MEMORY_LEVELS = ["working", "episodic", "semantic", "procedural"] as const;

export default function MemoryView() {
    const client = useQueryClient();
    const { showToast } = useSnackbar();

    const [projectId, setProjectId] = useState("");
    const [agentId, setAgentId] = useState("default");
    const [memoryLevel, setMemoryLevel] = useState("");
    const [offset, setOffset] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<MemoryItem[] | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<MemoryItem | null>(null);
    const [forgetReason, setForgetReason] = useState("user_requested");
    const [auditOffset, setAuditOffset] = useState(0);

    const projectsQuery = useQuery({
        queryKey: queryKeys.projects.all,
        queryFn: ({ signal }) => listProjects({ signal }),
    });

    const listParams = useMemo(
        () => ({
            memoryLevel: memoryLevel || undefined,
            projectId: projectId || undefined,
            agentId: agentId || "default",
            offset,
        }),
        [memoryLevel, projectId, agentId, offset]
    );

    const listQuery = useQuery({
        queryKey: queryKeys.memory.list(listParams),
        queryFn: ({ signal }) =>
            listMemories({
                ...listParams,
                limit: PAGE_SIZE,
                signal,
            }),
    });

    const detailQuery = useQuery({
        queryKey: queryKeys.memory.detail(selectedId ?? ""),
        queryFn: ({ signal }) => getMemory(selectedId!, { signal }),
        enabled: Boolean(selectedId),
    });

    const auditQuery = useQuery({
        queryKey: queryKeys.memory.audit(auditOffset),
        queryFn: ({ signal }) => listMemoryAuditLogs({ limit: PAGE_SIZE, offset: auditOffset, signal }),
    });

    const searchMutation = useMutation({
        mutationFn: () =>
            searchMemories({
                query: searchQuery.trim(),
                agent_id: agentId || "default",
                project_id: projectId || undefined,
                memory_levels: memoryLevel ? [memoryLevel] : undefined,
            }),
        onSuccess: (items) => setSearchResults(items),
        onError: (error) =>
            showToast({
                message: getQueryErrorMessage(error, "Memory search failed."),
                severity: "error",
            }),
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            if (!confirmDelete) throw new Error("No memory selected.");
            if (forgetReason.trim()) {
                await forgetMemory(confirmDelete.id, forgetReason.trim());
            } else {
                await deleteMemory(confirmDelete.id);
            }
        },
        onSuccess: async () => {
            setConfirmDelete(null);
            if (selectedId === confirmDelete?.id) setSelectedId(null);
            await client.invalidateQueries({ queryKey: queryKeys.memory.all });
            showToast({ message: "Memory forgotten.", severity: "success" });
        },
        onError: (error) =>
            showToast({
                message: getQueryErrorMessage(error, "Forget failed."),
                severity: "error",
            }),
    });

    const displayItems = searchResults ?? listQuery.data?.items ?? [];
    const projects = projectsQuery.data ?? [];

    return (
        <PageShell width="wide">
            <SettingsTabs />

            <div className="flex gap-[16px]">
                <SectionCard title="Filters & search" description="Scope by level, project, and agent.">
                    <div className="flex gap-[16px]">
                        <div className="flex flex-col sm:flex-row gap-[16px] flex-wrap">
                            <FormField
                                as="select"
                                label="Memory level"
                                value={memoryLevel}
                                onChange={(e: any) => {
                                    setMemoryLevel(e.target.value);
                                    setOffset(0);
                                    setSearchResults(null);
                                }}>
                                <option>All levels</option>
                                {MEMORY_LEVELS.map((level) => (
                                    <option key={level}>
                                        {level}
                                    </option>
                                ))}
                            </FormField>
                            <FormField
                                as="select"
                                label="Project"
                                value={projectId}
                                onChange={(e: any) => {
                                    setProjectId(e.target.value);
                                    setOffset(0);
                                    setSearchResults(null);
                                }}>
                                <option>All projects</option>
                                {projects.map((project) => (
                                    <option key={project.id}>
                                        {project.name}
                                    </option>
                                ))}
                            </FormField>
                            <FormField
                                label="Agent ID"
                                value={agentId}
                                onChange={(e: any) => {
                                    setAgentId(e.target.value);
                                    setOffset(0);
                                    setSearchResults(null);
                                }} />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-[8px]">
                            <FormField
                                label="Search query"
                                value={searchQuery}
                                onChange={(e: any) => setSearchQuery(e.target.value)} />
                            <Button
                                variant="default"
                                disabled={!searchQuery.trim() || searchMutation.isPending}
                                onClick={() => searchMutation.mutate()}
                                type="button"
                            ><SearchIcon />Search
                                                            </Button>
                            {searchResults ? (
                                <Button variant="outline" onClick={() => setSearchResults(null)} type="button">
                                    Clear search
                                </Button>
                            ) : null}
                        </div>
                    </div>
                </SectionCard>

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
                                <div style={{ overflowX: "auto" }}>
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
                                <PaginationControls count={listQuery.data?.total ?? 0} page={Math.floor(offset / PAGE_SIZE)} rowsPerPage={PAGE_SIZE} onPageChange={(page) => setOffset(page * PAGE_SIZE)} />
                            ) : null}
                        </QueryBoundary>
                    )}
                </SectionCard>

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

                <SectionCard title="Audit history" description="Remember / forget operations for your account.">
                    <QueryBoundary
                        isLoading={auditQuery.isLoading}
                        isError={auditQuery.isError}
                        error={auditQuery.error}
                        onRetry={() => void auditQuery.refetch()}
                    >
                        <div style={{ overflowX: "auto" }}>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border">
                                        <td className="p-2 align-top">Operation</td>
                                        <td className="p-2 align-top">Level</td>
                                        <td className="p-2 align-top">Agent</td>
                                        <td className="p-2 align-top">Source ref</td>
                                        <td className="p-2 align-top">When</td>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(auditQuery.data?.items ?? []).map((log) => (
                                        <tr key={log.id} className="border-b border-border">
                                            <td className="p-2 align-top">{log.operation}</td>
                                            <td className="p-2 align-top">{log.memory_level ?? "—"}</td>
                                            <td className="p-2 align-top">{log.agent_id ?? "—"}</td>
                                            <td className="p-2 align-top">{log.source_ref ?? "—"}</td>
                                            <td className="p-2 align-top">
                                                {new Date(log.created_at).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <PaginationControls count={auditQuery.data?.total ?? 0} page={Math.floor(auditOffset / PAGE_SIZE)} rowsPerPage={PAGE_SIZE} onPageChange={(page) => setAuditOffset(page * PAGE_SIZE)} />
                    </QueryBoundary>
                </SectionCard>
            </div>

            <div>
                <div>Forget memory?</div>
                <div>
                    <div className="flex gap-[16px]" style={{ marginTop: 8 }}>
                        <div role="alert" className="rounded-lg border border-border p-3 text-sm">
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
