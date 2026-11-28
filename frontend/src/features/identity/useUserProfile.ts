import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

import { getProfile, type Profile } from "@/features/identity/profileApi";
import { queryKeys } from "../../lib/queryKeys";
import { QUERY_STALE_TIMES } from "../../lib/queryTiming";

type UseUserProfileOptions = Pick<UseQueryOptions<Profile>, "enabled">;

export function useUserProfile(options?: UseUserProfileOptions) {
    return useQuery({
        queryKey: queryKeys.users.profile,
        queryFn: ({ signal }) => getProfile({ signal }),
        staleTime: QUERY_STALE_TIMES.userProfile,
        ...options,
    });
}
