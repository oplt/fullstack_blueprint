import { useTranslation } from "react-i18next";

export function SkipToContentLink({ href = "#main-content", label }: { href?: string; label?: string }) {
    const { t } = useTranslation();
    return <a href={href} className="fixed start-4 top-4 z-[1800] -translate-y-[160%] rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-lg transition-transform focus-visible:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{label ?? t("accessibility.skipToMain", { defaultValue: "Skip to main content" })}</a>;
}
