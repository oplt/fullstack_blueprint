import { useMemo, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TablePagination,
    TextField,
    Typography,
} from "@/components/ui/muiCompat";
import {
    DeleteOutline as DeleteIcon,
    Memory as MemoryIcon,
    Search as SearchIcon,
} from "@/components/ui/iconsCompat";
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
        <PageShell maxWidth="xl">
            <SettingsTabs />

            <Stack spacing={2}>
                <SectionCard title="Filters & search" description="Scope by level, project, and agent.">
                    <Stack spacing={2}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexWrap="wrap" useFlexGap>
                            <TextField
                                select
                                size="small"
                                label="Memory level"
                                value={memoryLevel}
                                onChange={(e: any) => {
                                    setMemoryLevel(e.target.value);
                                    setOffset(0);
                                    setSearchResults(null);
                                }}
                                sx={{ minWidth: 180 }}
                            >
                                <MenuItem value="">All levels</MenuItem>
                                {MEMORY_LEVELS.map((level) => (
                                    <MenuItem key={level} value={level}>
                                        {level}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                select
                                size="small"
                                label="Project"
                                value={projectId}
                                onChange={(e: any) => {
                                    setProjectId(e.target.value);
                                    setOffset(0);
                                    setSearchResults(null);
                                }}
                                sx={{ minWidth: 220 }}
                            >
                                <MenuItem value="">All projects</MenuItem>
                                {projects.map((project) => (
                                    <MenuItem key={project.id} value={project.id}>
                                        {project.name}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                size="small"
                                label="Agent ID"
                                value={agentId}
                                onChange={(e: any) => {
                                    setAgentId(e.target.value);
                                    setOffset(0);
                                    setSearchResults(null);
                                }}
                                sx={{ minWidth: 160 }}
                            />
                        </Stack>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                            <TextField
                                size="small"
                                label="Search query"
                                value={searchQuery}
                                onChange={(e: any) => setSearchQuery(e.target.value)}
                                fullWidth
                            />
                            <Button
                                variant="contained"
                                startIcon={<SearchIcon />}
                                disabled={!searchQuery.trim() || searchMutation.isPending}
                                onClick={() => searchMutation.mutate()}
                            >
                                Search
                            </Button>
                            {searchResults ? (
                                <Button
                                    variant="outlined"
                                    onClick={() => setSearchResults(null)}
                                >
                                    Clear search
                                </Button>
                            ) : null}
                        </Stack>
                    </Stack>
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
                                <Box sx={{ overflowX: "auto" }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Content</TableCell>
                                                <TableCell>Level</TableCell>
                                                <TableCell>Privacy</TableCell>
                                                <TableCell>Confidence</TableCell>
                                                <TableCell>Updated</TableCell>
                                                <TableCell align="right">Actions</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {displayItems.map((item) => (
                                                <TableRow
                                                    key={item.id}
                                                    selected={selectedId === item.id}
                                                    hover
                                                    onClick={() => setSelectedId(item.id)}
                                                    sx={{ cursor: "pointer" }}
                                                >
                                                    <TableCell sx={{ maxWidth: 360 }}>
                                                        <Typography variant="body2" noWrap>
                                                            {item.content}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            size="small"
                                                            label={item.metadata.memory_level}
                                                        />
                                                    </TableCell>
                                                    <TableCell>{item.metadata.privacy}</TableCell>
                                                    <TableCell>
                                                        {item.metadata.confidence.toFixed(2)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {item.updated_at
                                                            ? new Date(item.updated_at).toLocaleString()
                                                            : "—"}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Button
                                                            size="small"
                                                            color="error"
                                                            startIcon={<DeleteIcon />}
                                                            onClick={(e: any) => {
                                                                e.stopPropagation();
                                                                setConfirmDelete(item);
                                                            }}
                                                        >
                                                            Forget
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Box>
                            )}
                            {!searchResults ? (
                                <TablePagination
                                    component="div"
                                    count={listQuery.data?.total ?? 0}
                                    page={Math.floor(offset / PAGE_SIZE)}
                                    onPageChange={(_: any, page: any) => setOffset(page * PAGE_SIZE)}
                                    rowsPerPage={PAGE_SIZE}
                                    rowsPerPageOptions={[PAGE_SIZE]}
                                />
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
                        <Box sx={{ overflowX: "auto" }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Operation</TableCell>
                                        <TableCell>Level</TableCell>
                                        <TableCell>Agent</TableCell>
                                        <TableCell>Source ref</TableCell>
                                        <TableCell>When</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(auditQuery.data?.items ?? []).map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell>{log.operation}</TableCell>
                                            <TableCell>{log.memory_level ?? "—"}</TableCell>
                                            <TableCell>{log.agent_id ?? "—"}</TableCell>
                                            <TableCell>{log.source_ref ?? "—"}</TableCell>
                                            <TableCell>
                                                {new Date(log.created_at).toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>
                        <TablePagination
                            component="div"
                            count={auditQuery.data?.total ?? 0}
                            page={Math.floor(auditOffset / PAGE_SIZE)}
                            onPageChange={(_: any, page: any) => setAuditOffset(page * PAGE_SIZE)}
                            rowsPerPage={PAGE_SIZE}
                            rowsPerPageOptions={[PAGE_SIZE]}
                        />
                    </QueryBoundary>
                </SectionCard>
            </Stack>

            <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)}>
                <DialogTitle>Forget memory?</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Alert severity="warning">
                            This permanently removes the memory item and records an audit entry.
                            It is separate from search/list browsing.
                        </Alert>
                        <Typography variant="body2">{confirmDelete?.content}</Typography>
                        <TextField
                            size="small"
                            label="Reason"
                            value={forgetReason}
                            onChange={(e: any) => setForgetReason(e.target.value)}
                            required
                            helperText="Required for forget audit trail"
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
                    <Button
                        color="error"
                        variant="contained"
                        disabled={deleteMutation.isPending || forgetReason.trim().length < 3}
                        onClick={() => deleteMutation.mutate()}
                    >
                        Forget
                    </Button>
                </DialogActions>
            </Dialog>
        </PageShell>
    );
}
