import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

import { getMe, type UserProfile } from "@/features/identity/usersApi";
import { queryKeys } from "../../lib/queryKeys";
import { QUERY_STALE_TIMES } from "../../lib/queryTiming";

type UseCurrentUserOptions = Pick<UseQueryOptions<UserProfile>, "enabled">;

export function useCurrentUser(options?: UseCurrentUserOptions) {
    return useQuery({
        queryKey: queryKeys.users.me,
        queryFn: ({ signal }) => getMe({ signal }),
        staleTime: QUERY_STALE_TIMES.userProfile,
        ...options,
    });
}
