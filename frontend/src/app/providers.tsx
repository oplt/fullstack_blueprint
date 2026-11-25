import { useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore, type PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import {
    applyTheme,
    getBrowserStorage,
    prefersDarkMode,
    subscribeToSystemMode,
    loadThemePreferences,
    saveThemePreferences,
    type ThemePreferences,
} from "./theme";
import { queryClient } from "../config/queryClient";
import { AuthProvider } from "../features/auth/context/AuthContext";
import { ColorModeContext } from "./colorModeContext";
import { Toaster } from "../components/ui/sonner";
import { I18nextProvider } from "react-i18next";
import { i18nInstance, setLanguage } from "../i18n/config";
import { useLanguage } from "../i18n/useLanguage";
import { ApplicationConfigurationProvider } from "@/config/application/context";
import { useApplicationConfiguration } from "@/config/application/useConfiguration";
import type { ApplicationConfiguration, ApplicationConfigurationInput } from "@/config/application/types";

export function AppProviders({ children, configuration }: PropsWithChildren<{ configuration?: ApplicationConfiguration | ApplicationConfigurationInput }>) {
    return <ApplicationConfigurationProvider configuration={configuration}><ConfiguredProviders>{children}</ConfiguredProviders></ApplicationConfigurationProvider>;
}

function ConfiguredProviders({ children }: PropsWithChildren) {
    const [preferences, setPreferences] = useState<ThemePreferences>(() => loadThemePreferences(getBrowserStorage()));
    const prefersDark = useSyncExternalStore(subscribeToSystemMode, prefersDarkMode, () => false);
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
            resolvedMode,
            setColorMode: (colorMode: ThemePreferences["colorMode"]) =>
                setPreferences((current) => ({ ...current, colorMode })),
        }),
        [preferences, resolvedMode],
    );

    return (
        <I18nextProvider i18n={i18nInstance}>
            <LanguageDocumentSync>
                <ColorModeContext.Provider value={contextValue}>
                    <QueryClientProvider client={queryClient}>
                        <AuthProvider>
                            <Toaster theme={resolvedMode} position="bottom-center" />
                            {children}
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
