import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

import { getNotifications, type Notification } from "@/features/notifications/api";
import { queryKeys } from "../../lib/queryKeys";
import {
    NOTIFICATIONS_REFETCH_INTERVAL_MS,
    QUERY_STALE_TIMES,
} from "../../lib/queryTiming";

type UseNotificationsOptions = Pick<
    UseQueryOptions<Notification[]>,
    "enabled" | "refetchInterval" | "refetchOnWindowFocus"
>;

export function useNotifications(options?: UseNotificationsOptions) {
    return useQuery({
        queryKey: queryKeys.notifications.all,
        queryFn: ({ signal }) => getNotifications({ signal }),
        staleTime: QUERY_STALE_TIMES.notifications,
        refetchInterval: NOTIFICATIONS_REFETCH_INTERVAL_MS,
        ...options,
    });
}
