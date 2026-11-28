import { useQuery } from "@tanstack/react-query";

import { getPlatformMetadata } from "./platformApi";
import { queryKeys } from "./queryKeys";
import { QUERY_STALE_TIMES } from "./queryTiming";

export function usePlatformMetadata() {
    return useQuery({
        queryKey: queryKeys.platform.metadata,
        queryFn: () => getPlatformMetadata(),
        staleTime: QUERY_STALE_TIMES.platformMetadata,
        retryOnMount: false,
        refetchOnWindowFocus: false,
    });
}
