import { ErrorState } from "./error-state";
import { LoadingState } from "./loading-state";
import { Skeleton } from "./skeleton";
import { getQueryErrorMessage } from "../../utils/queryErrors";
type QueryBoundaryProps = { isLoading?: boolean; isError?: boolean; error?: unknown; isEmpty?: boolean; errorFallback?: string; errorTitle?: string; severity?: "error" | "warning" | "info" | "success"; onRetry?: () => void; loadingFallback?: React.ReactNode; emptyFallback?: React.ReactNode; variant?: "inline" | "page"; children: React.ReactNode };
export function QueryErrorAlert({ error, fallback = "Failed to load data.", title, onRetry }: { error: unknown; fallback?: string; title?: string; onRetry?: () => void }) { if (!error) return null; return <ErrorState title={title} description={getQueryErrorMessage(error, fallback)} actionLabel="Retry" onRetry={onRetry} />; }
export function QueryBoundary({ isLoading = false, isError = false, error, isEmpty = false, errorFallback = "Failed to load data.", errorTitle, onRetry, loadingFallback, emptyFallback, variant = "inline", children }: QueryBoundaryProps) {
    if (isLoading) return loadingFallback ? <div role="status" aria-busy="true" aria-live="polite">{loadingFallback}</div> : variant === "page" ? <LoadingState label="Loading" className="min-h-[40vh]" /> : <div role="status" aria-busy="true" aria-live="polite"><Skeleton className="h-[120px] w-full rounded-xl" /></div>;
    if (isError) return <ErrorState title={errorTitle} description={getQueryErrorMessage(error, errorFallback)} actionLabel="Retry" onRetry={onRetry} />;
    if (isEmpty) return emptyFallback ? <>{emptyFallback}</> : <div role="status" className="rounded-lg border border-information/30 bg-information/10 p-4 text-sm text-information-foreground">Nothing to show yet. Check filters or complete the previous step, then retry.</div>;
    return <>{children}</>;
}
