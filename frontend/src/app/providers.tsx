import { useEffect, useLayoutEffect, useMemo, useState, type PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import {
    applyTheme,
    loadThemePreferences,
    saveThemePreferences,
    type ThemePreferences,
} from "./theme";
import { queryClient } from "../config/queryClient";
import { AuthProvider } from "../features/auth/context/AuthContext";
import { SnackbarProvider } from "./SnackbarProvider";
import { ColorModeContext } from "./colorModeContext";
import { Toaster } from "../components/ui/sonner";
import { I18nextProvider } from "react-i18next";
import { i18nInstance, setLanguage } from "../i18n/config";
import { useLanguage } from "../i18n/useLanguage";
import { ApplicationConfigurationProvider } from "./configuration/context";
import { useApplicationConfiguration } from "./configuration/useConfiguration";
import type { ApplicationConfiguration, ApplicationConfigurationInput } from "./configuration/types";

function getBrowserStorage(): Storage | undefined {
    if (typeof window === "undefined") {
        return undefined;
    }

    try {
        return window.localStorage;
    } catch {
        return undefined;
    }
}

function usePrefersDark(): boolean {
    const [matches, setMatches] = useState(false);
    useEffect(() => {
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const update = () => setMatches(media.matches);
        update();
        media.addEventListener("change", update);
        return () => media.removeEventListener("change", update);
    }, []);
    return matches;
}

export function AppProviders({ children, configuration }: PropsWithChildren<{ configuration?: ApplicationConfiguration | ApplicationConfigurationInput }>) {
    return <ApplicationConfigurationProvider configuration={configuration}><ConfiguredProviders>{children}</ConfiguredProviders></ApplicationConfigurationProvider>;
}

function ConfiguredProviders({ children }: PropsWithChildren) {
    const [preferences, setPreferences] = useState<ThemePreferences>(() => loadThemePreferences(getBrowserStorage()));
    const prefersDark = usePrefersDark();
    const resolvedMode = preferences.colorMode === "system"
        ? prefersDark
            ? "dark"
            : "light"
        : preferences.colorMode;

    useEffect(() => {
        saveThemePreferences(preferences, getBrowserStorage());
    }, [preferences]);

    useLayoutEffect(() => {
        applyTheme(resolvedMode);
    }, [resolvedMode]);

    const contextValue = useMemo(
        () => ({
            colorMode: preferences.colorMode,
            setColorMode: (colorMode: ThemePreferences["colorMode"]) =>
                setPreferences((current) => ({ ...current, colorMode })),
        }),
        [preferences],
    );

    return (
        <I18nextProvider i18n={i18nInstance}>
            <LanguageDocumentSync>
                <ColorModeContext.Provider value={contextValue}>
                    <QueryClientProvider client={queryClient}>
                        <AuthProvider>
                            <SnackbarProvider>
                                <Toaster position="bottom-center" />
                                {children}
                            </SnackbarProvider>
                        </AuthProvider>
                    </QueryClientProvider>
                </ColorModeContext.Provider>
            </LanguageDocumentSync>
        </I18nextProvider>
    );
}

function LanguageDocumentSync({ children }: PropsWithChildren) {
    const { defaultLanguage } = useApplicationConfiguration();
    const { language } = useLanguage();
    useEffect(() => {
        if (language === defaultLanguage) return;
        try {
            if (window.localStorage.getItem("fullstack-blueprint.language")) return;
        } catch { /* storage is optional */ }
        void setLanguage(defaultLanguage);
    }, [defaultLanguage, language]);
    return <>{children}</>;
}
