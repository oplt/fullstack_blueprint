import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listAdminUsers, updateUserStatus, type AdminUserListResponse } from "@/features/admin/adminApi";
import { queryKeys } from "../../lib/queryKeys";
import { useDebounce } from "../../lib/useDebounce";
import { useMutationErrorToast } from "../../lib/useMutationErrorToast";

export const ADMIN_USERS_PAGE_SIZE = 20;

export function useAdminUsers() {
    const queryClient = useQueryClient();
    const toastMutationError = useMutationErrorToast();
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(0);
    const debouncedSearch = useDebounce(search, 300);
    const usersQueryKey = queryKeys.admin.users(page, debouncedSearch);
    const usersQuery = useQuery({
        queryKey: usersQueryKey,
        queryFn: ({ signal }) => listAdminUsers({
            page: page + 1,
            page_size: ADMIN_USERS_PAGE_SIZE,
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
            queryClient.setQueryData<AdminUserListResponse>(usersQueryKey, (old) => old
                ? { ...old, items: old.items.map((user) => user.id === id ? { ...user, is_active } : user) }
                : old);
            return { previous, queryKey: usersQueryKey };
        },
        onError: (error, _variables, context) => {
            if (context?.previous) queryClient.setQueryData(context.queryKey, context.previous);
            toastMutationError(error, "Failed to update user status.");
        },
        onSettled: () => void queryClient.invalidateQueries({ queryKey: queryKeys.admin.all }),
    });
    const users = usersQuery.data?.items ?? [];
    return {
        search, setSearch, page, setPage, users, usersQuery, statusMutation,
        activeCount: users.filter((user) => user.is_active).length,
        verifiedCount: users.filter((user) => user.is_verified).length,
    };
}
