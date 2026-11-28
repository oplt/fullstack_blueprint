import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    deleteMemory,
    forgetMemory,
    getMemory,
    listMemories,
    listMemoryAuditLogs,
    searchMemories,
    type MemoryItem,
} from "@/features/memory/api";
import { queryKeys } from "../../lib/queryKeys";
import { notify } from "../../lib/notify";
import { getQueryErrorMessage } from "../../lib/queryErrors";
import { useProjectsQuery } from "../../lib/useProjectsQuery";

const PAGE_SIZE = 20;
export const MEMORY_LEVELS = ["working", "episodic", "semantic", "procedural"] as const;

export function useMemoryWorkspace() {
    const client = useQueryClient();
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
    const [auditOpen, setAuditOpen] = useState(false);

    const { enabled: projectsEnabled, query: projectsQuery } = useProjectsQuery();
    const listParams = useMemo(() => ({
        memoryLevel: memoryLevel || undefined,
        projectId: projectId || undefined,
        agentId: agentId || "default",
        offset,
    }), [memoryLevel, projectId, agentId, offset]);
    const listQuery = useQuery({
        queryKey: queryKeys.memory.list(listParams),
        queryFn: ({ signal }) => listMemories({ ...listParams, limit: PAGE_SIZE, signal }),
    });
    const detailQuery = useQuery({
        queryKey: queryKeys.memory.detail(selectedId ?? ""),
        queryFn: ({ signal }) => getMemory(selectedId!, { signal }),
        enabled: Boolean(selectedId),
    });
    const auditQuery = useQuery({
        queryKey: queryKeys.memory.audit(auditOffset),
        queryFn: ({ signal }) => listMemoryAuditLogs({ limit: PAGE_SIZE, offset: auditOffset, signal }),
        enabled: auditOpen,
    });
    const searchMutation = useMutation({
        mutationFn: () => searchMemories({
            query: searchQuery.trim(),
            agent_id: agentId || "default",
            project_id: projectId || undefined,
            memory_levels: memoryLevel ? [memoryLevel] : undefined,
        }),
        onSuccess: setSearchResults,
        onError: (error) => notify({
            message: getQueryErrorMessage(error, "Memory search failed."),
            severity: "error",
        }),
    });
    const deleteMutation = useMutation({
        mutationFn: async () => {
            if (!confirmDelete) throw new Error("No memory selected.");
            if (forgetReason.trim()) await forgetMemory(confirmDelete.id, forgetReason.trim());
            else await deleteMemory(confirmDelete.id);
        },
        onSuccess: async () => {
            setConfirmDelete(null);
            if (selectedId === confirmDelete?.id) setSelectedId(null);
            await client.invalidateQueries({ queryKey: queryKeys.memory.all });
            notify({ message: "Memory forgotten.", severity: "success" });
        },
        onError: (error) => notify({
            message: getQueryErrorMessage(error, "Forget failed."),
            severity: "error",
        }),
    });

    return {
        projectId, setProjectId, agentId, setAgentId, memoryLevel, setMemoryLevel,
        offset, setOffset, searchQuery, setSearchQuery, searchResults, setSearchResults,
        selectedId, setSelectedId, confirmDelete, setConfirmDelete, forgetReason, setForgetReason,
        auditOffset, setAuditOffset, auditOpen, setAuditOpen, projectsEnabled, projectsQuery, projects: projectsQuery.data ?? [], listQuery,
        detailQuery, auditQuery, searchMutation, deleteMutation,
        displayItems: searchResults ?? listQuery.data?.items ?? [], pageSize: PAGE_SIZE,
    };
}
