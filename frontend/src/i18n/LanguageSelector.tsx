import { useState } from "react";
import { Check, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { setLanguage } from "./config";
import { supportedLanguages, type SupportedLanguage } from "./resources";
import { Button, buttonVariants } from "../components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
const languages: Record<SupportedLanguage, { flag: string; code: string; label: string }> = {
    en: { flag: "🇬🇧", code: "EN", label: "English" }, nl: { flag: "🇳🇱", code: "NL", label: "Nederlands" }, fr: { flag: "🇫🇷", code: "FR", label: "Français" },
};
export function LanguageSelector({ compact = true }: { compact?: boolean }) {
    const { i18n, t } = useTranslation();
    const [open, setOpen] = useState(false);
    const language = (i18n.resolvedLanguage ?? i18n.language ?? "en").split("-")[0] as SupportedLanguage;
    return <Popover open={open} onOpenChange={setOpen}><PopoverTrigger className={buttonVariants({ variant: "ghost", size: compact ? "icon" : "default" })} aria-label={t("actions.selectLanguage")} title={t("actions.selectLanguage")}><Globe className="ui-language-globe" aria-hidden="true" />{!compact && <span>{t("language.label")}</span>}</PopoverTrigger><PopoverContent align="end" side="bottom" sideOffset={8} className="ui-language-popover">{supportedLanguages.map((item) => {
        const option = languages[item];
        const selected = language === item;
        return <Button key={item} type="button" variant="ghost" aria-label={option.label} aria-pressed={selected} title={option.label} className="ui-language-option" onClick={() => { void setLanguage(item); setOpen(false); }}><span className="ui-language-flag" aria-hidden="true">{option.flag}</span><span className="text-label-sm">{option.code}</span>{selected && <Check className="ui-language-check" aria-hidden="true" />}</Button>;
    })}</PopoverContent></Popover>;
}
