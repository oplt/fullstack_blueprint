
import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useColorMode } from "../../app/colorModeContext";
import { Button } from "../ui/button";

export function ThemeSelector() {
    const { t } = useTranslation();
    const { resolvedMode, setColorMode } = useColorMode();

    const isDark = resolvedMode === "dark";
    const nextMode = isDark ? "light" : "dark";

    const label = t("accessibility.theme", {
        mode: t(`theme.${nextMode}`),
    });

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={label}
            title={label}
            onClick={() => setColorMode(nextMode)}
        >
            {isDark ? (
                <Sun className="size-5" aria-hidden="true" />
            ) : (
                <Moon className="size-5" aria-hidden="true" />
            )}
        </Button>
    );
}
