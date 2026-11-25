import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    markAllRead,
    markRead,
    updatePreferences,
    type Notification,
    type NotificationPreferences,
} from "../api/notifications";
import { queryKeys } from "../config/queryKeys";
import { useMutationErrorToast } from "./useMutationErrorToast";

export function useNotificationMutations() {
    const queryClient = useQueryClient();
    const toastMutationError = useMutationErrorToast();
    const markOne = useMutation({
        mutationFn: markRead,
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });
            const previous = queryClient.getQueryData<Notification[]>(queryKeys.notifications.all);
            queryClient.setQueryData<Notification[]>(queryKeys.notifications.all,
                (old) => old?.map((item) => item.id === id ? { ...item, is_read: true } : item) ?? []);
            return { previous };
        },
        onError: (error, _id, context) => {
            if (context?.previous) queryClient.setQueryData(queryKeys.notifications.all, context.previous);
            toastMutationError(error, "Failed to mark notification as read.");
        },
        onSettled: () => void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
    });
    const markAll = useMutation({
        mutationFn: markAllRead,
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });
            const previous = queryClient.getQueryData<Notification[]>(queryKeys.notifications.all);
            queryClient.setQueryData<Notification[]>(queryKeys.notifications.all,
                (old) => old?.map((item) => ({ ...item, is_read: true })) ?? []);
            return { previous };
        },
        onError: (error, _variables, context) => {
            if (context?.previous) queryClient.setQueryData(queryKeys.notifications.all, context.previous);
            toastMutationError(error, "Failed to mark all notifications as read.");
        },
        onSettled: () => void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
    });
    const preferences = useMutation({
        mutationFn: updatePreferences,
        onMutate: async (partial) => {
            await queryClient.cancelQueries({ queryKey: queryKeys.notifications.preferences });
            const previous = queryClient.getQueryData<NotificationPreferences>(queryKeys.notifications.preferences);
            queryClient.setQueryData<NotificationPreferences>(queryKeys.notifications.preferences, (old) => ({
                email_enabled: old?.email_enabled ?? true,
                push_enabled: old?.push_enabled ?? true,
                marketing_enabled: old?.marketing_enabled ?? false,
                ...partial,
            }));
            return { previous };
        },
        onError: (error, _partial, context) => {
            if (context?.previous) queryClient.setQueryData(queryKeys.notifications.preferences, context.previous);
            toastMutationError(error, "Failed to update notification preferences.");
        },
        onSettled: () => void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.preferences }),
    });
    return { markOne, markAll, preferences };
}
