import { createContext, useContext } from "react";
import type { AuthUser } from "@/features/identity/authApi";

export type AuthStatus = "initializing" | "authenticated" | "anonymous" | "unavailable";

export type AuthContextValue = {
    isReady: boolean;
    authStatus: AuthStatus;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isMfaEnabled: boolean;
    currentUser: AuthUser | null;
    logout: () => Promise<void>;
    setAuthenticated: (user: AuthUser) => void;
    retryAuth: () => Promise<unknown>;
};

export const AuthContext = createContext<AuthContextValue>({
    isReady: false,
    authStatus: "initializing",
    isAuthenticated: false,
    isAdmin: false,
    isMfaEnabled: false,
    currentUser: null,
    logout: async () => undefined,
    setAuthenticated: () => undefined,
    retryAuth: async () => undefined,
});

export function useAuth() {
    return useContext(AuthContext);
}
