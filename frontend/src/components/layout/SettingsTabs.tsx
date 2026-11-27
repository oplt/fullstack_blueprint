import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { getActiveSettingsTab, useSettingsTabs } from "../../hooks/useSettingsTabs";

export function SettingsTabs() {
    const location = useLocation();
    const { t } = useTranslation();
    const tabs = useSettingsTabs();
    if (!tabs.length) return null;

    const activePath = getActiveSettingsTab(location.pathname, tabs)?.path ?? tabs[0].path;
    return (
        <nav aria-label={t("navigation.settings")} className="mb-4 w-full min-w-0 overflow-x-auto border-b border-border">
            <div className="flex w-fit items-center gap-1">
                {tabs.map((item) => {
                    const active = item.path === activePath;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            aria-current={active ? "page" : undefined}
                            className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                        >
                            {item.label}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
