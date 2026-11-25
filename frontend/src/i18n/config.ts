import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { resources, supportedLanguages, type SupportedLanguage } from "./resources";

const LANGUAGE_STORAGE_KEY = "fullstack-blueprint.language";

function languageStorage(): Storage | undefined {
    if (typeof window === "undefined") return undefined;
    try { return window.localStorage; } catch { return undefined; }
}

function browserLanguage(): SupportedLanguage {
    if (typeof navigator === "undefined") return "en";
    const candidate = navigator.languages?.[0] ?? navigator.language ?? "en";
    const base = candidate.toLowerCase().split("-")[0] as SupportedLanguage;
    return supportedLanguages.includes(base) ? base : "en";
}

export function readLanguage(storage: Storage | undefined = languageStorage()): SupportedLanguage {
    try {
        const stored = storage?.getItem(LANGUAGE_STORAGE_KEY)?.toLowerCase().split("-")[0] as SupportedLanguage | undefined;
        return stored && supportedLanguages.includes(stored) ? stored : browserLanguage();
    } catch {
        return browserLanguage();
    }
}

export function languageDirection(language: string): "ltr" | "rtl" {
    return ["ar", "fa", "he", "ur"].includes(language.toLowerCase().split("-")[0]) ? "rtl" : "ltr";
}

export const i18nInstance = i18n;
if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
        resources,
        lng: readLanguage(),
        fallbackLng: "en",
        supportedLngs: supportedLanguages,
        interpolation: { escapeValue: false },
        returnNull: false,
        pluralSeparator: "_",
    });
}

export async function setLanguage(language: SupportedLanguage, storage: Storage | undefined = languageStorage()): Promise<void> {
    await i18n.changeLanguage(language);
    try { storage?.setItem(LANGUAGE_STORAGE_KEY, language); } catch { /* storage is optional */ }
}
