import { useQuery } from "@tanstack/react-query";

import { getPlatformMetadata } from "./api";
import { queryKeys } from "@/lib/queryKeys";
import { QUERY_STALE_TIMES } from "@/lib/queryTiming";

export function usePlatformMetadata() {
    return useQuery({
        queryKey: queryKeys.platform.metadata,
        queryFn: () => getPlatformMetadata(),
        staleTime: QUERY_STALE_TIMES.platformMetadata,
        retryOnMount: false,
        refetchOnWindowFocus: false,
    });
}
