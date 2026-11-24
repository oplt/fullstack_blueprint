import { useTranslation } from "react-i18next";
import { setLanguage } from "../../i18n/config";
import { supportedLanguages, type SupportedLanguage } from "../../i18n/resources";

const labels: Record<SupportedLanguage, string> = { en: "English", nl: "Nederlands", fr: "Français" };

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
    const { i18n, t } = useTranslation();
    const language = (i18n.resolvedLanguage ?? i18n.language ?? "en").split("-")[0] as SupportedLanguage;
    return <label className="inline-flex min-h-10 items-center gap-2 text-sm">
        <span className={compact ? "sr-only" : "text-muted-foreground"}>{t("language.label")}</span>
        <select aria-label={t("actions.selectLanguage")} value={language} onChange={(event) => { void setLanguage(event.target.value as SupportedLanguage); }} className="h-10 rounded-lg border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            {supportedLanguages.map((item) => <option key={item} value={item}>{labels[item]}</option>)}
        </select>
    </label>;
}
