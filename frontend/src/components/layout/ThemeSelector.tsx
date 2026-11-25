import { useTranslation } from "react-i18next";
import { useColorMode } from "../../app/colorModeContext";
import { NativeSelect } from "../ui/native-select";

export function ThemeSelector() {
    const { t } = useTranslation();
    const { colorMode, resolvedMode, setColorMode } = useColorMode();
    return <NativeSelect value={colorMode} aria-label={t("accessibility.theme", { mode: t(`theme.${resolvedMode}`) })}
        onChange={({ target: { value } }) => {
            if (value === "light" || value === "dark" || value === "system") setColorMode(value);
        }}>
        <option value="light">{t("theme.light")}</option>
        <option value="dark">{t("theme.dark")}</option>
        <option value="system">{t("theme.system")} ({t(`theme.${resolvedMode}`)})</option>
    </NativeSelect>;
}
