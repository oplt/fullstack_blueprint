import { useTranslation } from "react-i18next";
export function SkipToContentLink({ href = "#main-content", label }: { href?: string; label?: string }) {
    const { t } = useTranslation();
    return <a href={href} className="ui-skip-link">{label ?? t("accessibility.skipToMain", { defaultValue: "Skip to main content" })}</a>;
}
