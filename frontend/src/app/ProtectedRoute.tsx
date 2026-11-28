import { Navigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { LoadingState } from "../components/Feedback";
import { ROUTES } from "./routes";
type Props = { isReady: boolean; isAuthenticated: boolean; authStatus?: "initializing" | "authenticated" | "anonymous" | "unavailable"; retryAuth?: () => Promise<unknown>; isAdmin?: boolean; isMfaEnabled?: boolean; requireAdmin?: boolean; requireMfa?: boolean; redirectTo?: string; children?: React.ReactNode };
export function ProtectedRoute({ isReady, isAuthenticated, authStatus, retryAuth, isAdmin, isMfaEnabled, requireAdmin, requireMfa, redirectTo = ROUTES.home, children }: Props) {
    if (authStatus === "unavailable") return <div role="alert" className="flex min-h-screen flex-col items-center justify-center gap-ui-md p-ui-lg"><p>Authentication service is unavailable.</p><Button type="button" onClick={() => void retryAuth?.()}>Retry</Button></div>;
    if (!isReady) return <LoadingState label="Loading" className="min-h-screen" />;
    if (!isAuthenticated) return <Navigate to={redirectTo} replace />;
    if (requireAdmin && !isAdmin) return <Navigate to={ROUTES.dashboard} replace />;
    if (requireMfa && !isMfaEnabled) return <Navigate to={ROUTES.profile} replace />;
    return <>{children}</>;
}
