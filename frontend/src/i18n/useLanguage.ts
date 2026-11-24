import { useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { languageDirection, setLanguage } from "./config";
import type { SupportedLanguage } from "./resources";

export function useLanguage() {
    const { i18n, t } = useTranslation();
    const language = ((i18n.resolvedLanguage ?? i18n.language ?? "en").split("-")[0]) as SupportedLanguage;
    const direction = languageDirection(language);
    useEffect(() => {
        document.documentElement.lang = language;
        document.documentElement.dir = direction;
    }, [direction, language]);
    const changeLanguage = useCallback((next: SupportedLanguage) => setLanguage(next), []);
    return useMemo(() => ({ language, direction, changeLanguage, t }), [changeLanguage, direction, language, t]);
}
