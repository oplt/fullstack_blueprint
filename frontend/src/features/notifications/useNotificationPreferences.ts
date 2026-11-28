import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

import { getPreferences, type NotificationPreferences } from "@/features/notifications/api";
import { queryKeys } from "../../lib/queryKeys";
import { QUERY_STALE_TIMES } from "../../lib/queryTiming";

type UseNotificationPreferencesOptions = Pick<UseQueryOptions<NotificationPreferences>, "enabled">;

export function useNotificationPreferences(options?: UseNotificationPreferencesOptions) {
    return useQuery({
        queryKey: queryKeys.notifications.preferences,
        queryFn: ({ signal }) => getPreferences({ signal }),
        staleTime: QUERY_STALE_TIMES.notificationPreferences,
        ...options,
    });
}
