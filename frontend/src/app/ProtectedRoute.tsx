import { Navigate } from "react-router-dom";
import { LoadingState } from "../components/ui/loading-state";
import { ROUTES } from "../lib/routes";
type Props = { isReady: boolean; isAuthenticated: boolean; isAdmin?: boolean; isMfaEnabled?: boolean; requireAdmin?: boolean; requireMfa?: boolean; redirectTo?: string; children?: React.ReactNode };
export function ProtectedRoute({ isReady, isAuthenticated, isAdmin, isMfaEnabled, requireAdmin, requireMfa, redirectTo = ROUTES.home, children }: Props) { if (!isReady) return <LoadingState label="Loading" className="min-h-screen" />; if (!isAuthenticated) return <Navigate to={redirectTo} replace />; if (requireAdmin && !isAdmin) return <Navigate to={ROUTES.dashboard} replace />; if (requireMfa && !isMfaEnabled) return <Navigate to={ROUTES.profile} replace />; return <>{children}</>; }
