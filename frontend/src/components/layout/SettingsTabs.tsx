import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { getActiveSettingsTab, useSettingsTabs } from "../../hooks/useSettingsTabs";
import { PageTabs } from "../ui/PageTabs";

export function SettingsTabs() {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const tabs = useSettingsTabs();
    if (!tabs.length) return null;

    const activePath = getActiveSettingsTab(location.pathname, tabs)?.path ?? tabs[0].path;
    return (
        <PageTabs
            value={activePath}
            onChange={navigate}
            ariaLabel={t("navigation.settings")}
            tabs={tabs.map((item) => ({ value: item.path, label: item.label }))}
        />
    );
}
