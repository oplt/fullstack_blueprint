import { ErrorState } from "./error-state";
import { LoadingState } from "./loading-state";
import { Skeleton } from "./skeleton";
import { getQueryErrorMessage } from "../../lib/queryErrors";
type QueryBoundaryProps = { isLoading?: boolean; isError?: boolean; error?: unknown; isEmpty?: boolean; errorFallback?: string; errorTitle?: string; severity?: "error" | "warning" | "info" | "success"; onRetry?: () => void; loadingFallback?: React.ReactNode; emptyFallback?: React.ReactNode; variant?: "inline" | "page"; children: React.ReactNode };
export function QueryErrorAlert({ error, fallback = "Failed to load data.", title, onRetry }: { error: unknown; fallback?: string; title?: string; onRetry?: () => void }) { if (!error) return null; return <ErrorState title={title} description={getQueryErrorMessage(error, fallback)} actionLabel="Retry" onRetry={onRetry} />; }
function QueryLoading({ loadingFallback, variant }: Pick<QueryBoundaryProps, "loadingFallback" | "variant">) {
    return loadingFallback ? <div role="status" aria-busy="true" aria-live="polite">{loadingFallback}</div> : variant === "page" ? <LoadingState label="Loading" className="ui-query-page-loading" /> : <div role="status" aria-busy="true" aria-live="polite"><Skeleton className="ui-stat-card-skeleton" /></div>;
}
export function QueryBoundary({ isLoading, isError, error, isEmpty, errorFallback = "Failed to load data.", errorTitle, onRetry, loadingFallback, emptyFallback, variant, children }: QueryBoundaryProps) {
    if (isLoading) return <QueryLoading loadingFallback={loadingFallback} variant={variant} />;
    if (isError) return <ErrorState title={errorTitle} description={getQueryErrorMessage(error, errorFallback)} actionLabel="Retry" onRetry={onRetry} />;
    if (isEmpty) return emptyFallback ? <>{emptyFallback}</> : <div role="status" className="ui-query-empty">Nothing to show yet. Check filters or complete the previous step, then retry.</div>;
    return <>{children}</>;
}
