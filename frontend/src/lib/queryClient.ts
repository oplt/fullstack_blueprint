import { QueryClient } from '@tanstack/react-query'

import { ApiError } from './api'
import { QUERY_GC_TIME_MS, QUERY_STALE_TIMES } from './queryTiming'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_STALE_TIMES.default,
      gcTime: QUERY_GC_TIME_MS,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false
        }
        return failureCount < 1
      },
      refetchOnWindowFocus: false,
    },
  },
})
