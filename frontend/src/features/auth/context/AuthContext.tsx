import { useState, type PropsWithChildren } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { logout as logoutRequest, me, type AuthUser } from "../../../api/auth";
import { clearUserSessionCache, queryKeys, resetUserSessionCache } from "../../../config/queryKeys";
import { QUERY_STALE_TIMES } from "../../../config/queryTiming";
import { AuthContext } from "./authContext";

export function AuthProvider({ children }: PropsWithChildren) {
    const queryClient = useQueryClient();
    const [signedOut, setSignedOut] = useState(false);
    const {
        data: currentUser = null,
        isPending,
        isError,
    } = useQuery<AuthUser | null>({
        queryKey: queryKeys.auth.me,
        queryFn: ({ signal }) => me({ signal }),
        retry: false,
        staleTime: QUERY_STALE_TIMES.userProfile,
    });

    const visibleUser = signedOut ? null : currentUser;
    const isAuthenticated = visibleUser !== null;
    const isReady = !isPending || isError;

    async function logout() {
        // A cleared active query may refetch while the server request is
        // failing. Keep the browser signed out independently of that timing.
        setSignedOut(true);
        try {
            await logoutRequest();
        } finally {
            // Never retain identity-scoped data when a logout request fails.
            // The server cookie may require a later retry, but this browser
            // must immediately stop rendering the previous user's records.
            await clearUserSessionCache(queryClient);
            queryClient.setQueryData(queryKeys.auth.me, null);
        }
    }

    function setAuthenticated(user: AuthUser) {
        // A sign-in can happen without a full page reload. Drop records that
        // were fetched for the previous identity before publishing the new one.
        resetUserSessionCache(queryClient);
        setSignedOut(false);
        queryClient.setQueryData(queryKeys.auth.me, user);
    }

    return (
        <AuthContext.Provider
            value={{
                isReady,
                isAuthenticated,
                isAdmin: visibleUser?.is_admin ?? false,
                isMfaEnabled: visibleUser?.mfa_enabled ?? false,
                currentUser: visibleUser,
                logout,
                setAuthenticated,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
