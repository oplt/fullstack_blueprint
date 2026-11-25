import { useTranslation } from "react-i18next";
import { useColorMode } from "../../app/colorModeContext";

export function ThemeSelector() {
    const { t } = useTranslation();
    const { colorMode, resolvedMode, setColorMode } = useColorMode();
    return <select value={colorMode} aria-label={t("accessibility.theme", { mode: t(`theme.${resolvedMode}`) })}
        className="min-h-10 rounded-md border bg-background text-sm"
        onChange={({ target: { value } }) => {
            if (value === "light" || value === "dark" || value === "system") setColorMode(value);
        }}>
        <option value="light">{t("theme.light")}</option>
        <option value="dark">{t("theme.dark")}</option>
        <option value="system">{t("theme.system")} ({t(`theme.${resolvedMode}`)})</option>
    </select>;
}
