import { useEffect, useLayoutEffect, useMemo, useState, type PropsWithChildren } from "react";
import { useMediaQuery } from "@/components/ui/muiCompat";
import { QueryClientProvider } from "@tanstack/react-query";
import { LocalizationProvider } from "@/components/ui/dateCompat";
import { AdapterDayjs } from "@/components/ui/dateCompat";
import {
    applyDesignTokens,
    createDesignTokens,
    loadThemePreferences,
    saveThemePreferences,
    THEME_PREFERENCES_STORAGE_KEY,
    type ThemePreferences,
} from "./designTokens";
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

export function AppProviders({ children, configuration }: PropsWithChildren<{ configuration?: ApplicationConfiguration | ApplicationConfigurationInput }>) {
    return <ApplicationConfigurationProvider configuration={configuration}><ConfiguredProviders>{children}</ConfiguredProviders></ApplicationConfigurationProvider>;
}

function ConfiguredProviders({ children }: PropsWithChildren) {
    const applicationConfiguration = useApplicationConfiguration();
    const [preferences, setPreferences] = useState<ThemePreferences>(() => {
        const storage = getBrowserStorage();
        const loaded = loadThemePreferences(storage);
        let hasPersistedPreferences = false;
        try { hasPersistedPreferences = Boolean(storage?.getItem(THEME_PREFERENCES_STORAGE_KEY)); } catch { /* storage is optional */ }
        return hasPersistedPreferences
            ? loaded
            : { ...loaded, preset: applicationConfiguration.themePreset, primaryColor: applicationConfiguration.branding.primaryColor };
    });
    const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
    const resolvedMode = preferences.colorMode === "system"
        ? prefersDark
            ? "dark"
            : "light"
        : preferences.colorMode;

    const tokens = useMemo(
        () => createDesignTokens({ ...preferences, mode: resolvedMode }),
        [preferences, resolvedMode],
    );
    useEffect(() => {
        saveThemePreferences(preferences, getBrowserStorage());
    }, [preferences]);

    useLayoutEffect(() => {
        applyDesignTokens(tokens);
    }, [tokens]);

    const contextValue = useMemo(
        () => ({
            colorMode: preferences.colorMode,
            setColorMode: (colorMode: ThemePreferences["colorMode"]) =>
                setPreferences((current) => ({ ...current, colorMode })),
            preset: preferences.preset,
            setPreset: (preset: ThemePreferences["preset"]) =>
                setPreferences((current) => ({ ...current, preset })),
            density: preferences.density,
            setDensity: (density: ThemePreferences["density"]) =>
                setPreferences((current) => ({ ...current, density })),
            radius: preferences.radius,
            setRadius: (radius: ThemePreferences["radius"]) =>
                setPreferences((current) => ({ ...current, radius })),
            primaryColor: preferences.primaryColor,
            setPrimaryColor: (primaryColor: string | undefined) =>
                setPreferences((current) => ({ ...current, primaryColor })),
            fontFamily: preferences.fontFamily,
            setFontFamily: (fontFamily: string | undefined) =>
                setPreferences((current) => ({ ...current, fontFamily })),
        }),
        [preferences],
    );

    return (
        <I18nextProvider i18n={i18nInstance}>
            <LanguageDocumentSync>
                <ColorModeContext.Provider value={contextValue}>
                    <QueryClientProvider client={queryClient}>
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <AuthProvider>
                                <SnackbarProvider>
                                    <Toaster position="bottom-center" />
                                    {children}
                                </SnackbarProvider>
                            </AuthProvider>
                        </LocalizationProvider>
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
