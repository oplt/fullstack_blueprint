import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

import { getSessions, type Session } from "@/features/identity/usersApi";
import { queryKeys } from "../../lib/queryKeys";
import { QUERY_STALE_TIMES } from "../../lib/queryTiming";

type UseUserSessionsOptions = Pick<UseQueryOptions<Session[]>, "enabled">;

export function useUserSessions(options?: UseUserSessionsOptions) {
    return useQuery({
        queryKey: queryKeys.users.sessions,
        queryFn: ({ signal }) => getSessions({ signal }),
        staleTime: QUERY_STALE_TIMES.userSessions,
        ...options,
    });
}
