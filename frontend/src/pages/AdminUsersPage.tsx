import { FormField } from "@/components/ui/form-field";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search as SearchIcon, PeopleAlt as PeopleAltIcon } from "@/components/ui/iconsCompat";
import { listAdminUsers, updateUserStatus, type AdminUserListResponse } from "../api/admin";
import { SettingsTabs } from "../components/layout/SettingsTabs";
import { EmptyState } from "../components/ui/EmptyState";
import { PageShell } from "../components/ui/PageShell";
import { QueryBoundary } from "../components/ui/QueryBoundary";
import { SectionCard } from "../components/ui/SectionCard";
import { StatCard } from "../components/ui/StatCard";
import { queryKeys } from "../config/queryKeys";
import { useDebounce } from "../hooks/useDebounce";
import { useMutationErrorToast } from "../hooks/useMutationErrorToast";
import { formatDate } from "../utils/formatters";
import { useIsMobile } from "../hooks/use-mobile";
import { PaginationControls } from "../components/ui/pagination";

export default function AdminUsersPage() {
    const queryClient = useQueryClient();
    const toastMutationError = useMutationErrorToast();
    const isMobile = useIsMobile();
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(0);
    const pageSize = 20;
    const debouncedSearch = useDebounce(search, 300);
    const usersQueryKey = queryKeys.admin.users(page, debouncedSearch);

    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: usersQueryKey,
        queryFn: ({ signal }) =>
            listAdminUsers({
                page: page + 1,
                page_size: pageSize,
                search: debouncedSearch || undefined,
                signal,
            }),
    });
    const statusMutation = useMutation({
        mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
            updateUserStatus(id, { is_active }),
        onMutate: async ({ id, is_active }) => {
            await queryClient.cancelQueries({ queryKey: queryKeys.admin.all });
            const previous = queryClient.getQueryData<AdminUserListResponse>(usersQueryKey);
            queryClient.setQueryData<AdminUserListResponse>(usersQueryKey, (old) =>
                old
                    ? {
                          ...old,
                          items: old.items.map((user) =>
                              user.id === id ? { ...user, is_active } : user
                          ),
                      }
                    : old
            );
            return { previous, queryKey: usersQueryKey };
        },
        onError: (mutationError, _vars, context) => {
            if (context?.previous) {
                queryClient.setQueryData(context.queryKey, context.previous);
            }
            toastMutationError(mutationError, "Failed to update user status.");
        },
        onSettled: () => void queryClient.invalidateQueries({ queryKey: queryKeys.admin.all }),
    });

    const users = data?.items ?? [];
    const activeCount = users.filter((user) => user.is_active).length;
    const verifiedCount = users.filter((user) => user.is_verified).length;

    return (
        <PageShell width="wide">
            <SettingsTabs />

            <div className="flex flex-row justify-end" style={{ marginBottom: 16 }}>
                <FormField
                    placeholder="Search users..."
                    value={search}
                    onChange={(event: any) => {
                        setSearch(event.target.value);
                        setPage(0);
                    }}
                    InputProps={{
                        startAdornment: (
                            <span>
                                <SearchIcon fontSize="small" />
                            </span>
                        ),
                    }} />
            </div>

            <div
                style={{
                    display: "grid",
                    gap: 16,
                    gridTemplateColumns: "1fr",
                }}
            >
                <StatCard
                    label="Total users"
                    value={data?.total ?? 0}
                    description="Accounts matching the current search and pagination scope"
                    icon={<PeopleAltIcon />}
                    loading={isLoading}
                />
                <StatCard
                    label="Active on page"
                    value={activeCount}
                    description="Users currently allowed to access the product"
                    icon={<PeopleAltIcon />}
                    loading={isLoading}
                    color="success"
                />
                <StatCard
                    label="Verified on page"
                    value={verifiedCount}
                    description="Accounts with confirmed email identity"
                    icon={<PeopleAltIcon />}
                    loading={isLoading}
                    color="secondary"
                />
            </div>

            <SectionCard title="User directory" description="Review roles, verification, and status changes from one place.">
                <QueryBoundary
                    isLoading={isLoading}
                    isError={isError}
                    error={error}
                    errorFallback="Failed to load users."
                    onRetry={() => void refetch()}
                    loadingFallback={
                        <div className="flex gap-[12px]">
                            {Array.from({ length: 5 }).map((_: any, index: any) => (
                                <div
                                    key={index}
                                    style={{ borderRadius: 16 }}
                                    className="animate-pulse rounded-md bg-muted" />
                            ))}
                        </div>
                    }
                    isEmpty={users.length === 0}
                    emptyFallback={
                        <EmptyState
                            icon={<PeopleAltIcon />}
                            title="No users found"
                            description="Try broadening the search or check if the current filters are too narrow."
                        />
                    }
                >
                    {isMobile ? (
                        <div className="flex gap-[12px]">
                            {users.map((user) => {
                                const isUpdatingThisUser =
                                    statusMutation.isPending &&
                                    statusMutation.variables?.id === user.id;
                                return (
                                    <div
                                        key={user.id}
                                        style={({
                                            padding: 18,
                                            borderRadius: 16,
                                            border: `1px solid ${"var(--border)"}`
                                        })}
                                    >
                                        <div className="flex gap-[10px]">
                                            <div className="flex flex-row gap-[8px] justify-between">
                                                <div style={{ minWidth: 0 }}>
                                                    <p>{user.full_name ?? "Unnamed user"}</p>
                                                    <p className="text-muted-foreground">
                                                        {user.email}
                                                    </p>
                                                </div>
                                                <input
                                                    checked={user.is_active}
                                                    disabled={isUpdatingThisUser}
                                                    onChange={(event: any) =>
                                                        statusMutation.mutate({
                                                            id: user.id,
                                                            is_active: event.target.checked,
                                                        })
                                                    }
                                                    type="checkbox"
                                                    role="switch"
                                                    aria-label={`${user.is_active ? "Deactivate" : "Activate"} ${user.full_name ?? user.email}`} />
                                            </div>
                                            <div className="flex flex-row gap-[8px] flex-wrap">
                                                {user.roles.map((role) => (
                                                    <div
                                                        key={role}
                                                        className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />
                                                ))}
                                                <div
                                                    className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />
                                            </div>
                                            <span className="text-muted-foreground">
                                                Joined {formatDate(user.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="overflow-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border">
                                        <td className="p-2 align-top">Email</td>
                                        <td className="p-2 align-top">Name</td>
                                        <td className="p-2 align-top">Roles</td>
                                        <td className="p-2 align-top">Verified</td>
                                        <td className="p-2 align-top">Joined</td>
                                        <td align="center" className="p-2 align-top">Active</td>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => {
                                        const isUpdatingThisUser =
                                            statusMutation.isPending &&
                                            statusMutation.variables?.id === user.id;
                                        return (
                                            <tr key={user.id} className="border-b border-border">
                                                <td className="p-2 align-top">{user.email}</td>
                                                <td className="p-2 align-top">{user.full_name ?? "—"}</td>
                                                <td className="p-2 align-top">
                                                    <div className="flex flex-row gap-[6px] flex-wrap">
                                                        {user.roles.map((role) => (
                                                            <div
                                                                key={role}
                                                                className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="p-2 align-top">
                                                    <div
                                                        className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />
                                                </td>
                                                <td className="p-2 align-top">{formatDate(user.created_at)}</td>
                                                <td align="center" className="p-2 align-top">
                                                    <div title={user.is_active ? "Deactivate" : "Activate"}>
                                                            {isUpdatingThisUser ? (
                                                                <span
                                                                    className="inline-block animate-spin rounded-full border-2 border-primary border-t-transparent"
                                                                    role="progressbar"
                                                                    style={{
                                                                        width: 18,
                                                                        height: 18
                                                                    }} />
                                                            ) : (
                                                                <input
                                                                    checked={user.is_active}
                                                                    onChange={(event: any) =>
                                                                        statusMutation.mutate({
                                                                            id: user.id,
                                                                            is_active: event.target.checked,
                                                                        })
                                                                    }
                                                                    type="checkbox"
                                                                    role="switch"
                                                                    aria-label={`${user.is_active ? "Deactivate" : "Activate"} ${user.full_name ?? user.email}`} />
                                                            )}
                                                        </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </QueryBoundary>

                <PaginationControls count={data?.total ?? 0} page={page} rowsPerPage={pageSize} onPageChange={setPage} />
            </SectionCard>
        </PageShell>
    );
}
