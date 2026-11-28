/**
 * Mutability-aware TanStack Query stale times.
 * Prefer these over ad-hoc numbers so data freshness matches lifecycle.
 */
export const QUERY_STALE_TIMES = {
    default: 60_000,
    notifications: 30_000,
    notificationPreferences: 5 * 60_000,
    userProfile: 90_000,
    userSessions: 60_000,
    userDirectory: 60_000,
    platformMetadata: 5 * 60_000,
    /** Projects list/detail — moderate freshness */
    projects: 30_000,
    calendar: 60_000,
    agentRuns: 30_000,
    aiOverview: 60_000,
    aiReviews: 30_000,
    aiEvaluationRuns: 60_000,
    aiPromptVersions: 60_000,
    aiDatasetCases: 60_000,
} as const;

export const NOTIFICATIONS_REFETCH_INTERVAL_MS = 60_000;
export const QUERY_GC_TIME_MS = 10 * 60_000;

export function jobPollInterval(elapsedMs: number): number {
    if (elapsedMs < 10_000) return 2_000;
    if (elapsedMs < 30_000) return 4_000;
    if (elapsedMs < 60_000) return 8_000;
    if (elapsedMs < 120_000) return 15_000;
    return 30_000;
}
