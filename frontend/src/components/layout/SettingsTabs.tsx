import { useLocation, useNavigate } from "react-router-dom";
import { getActiveSettingsTab, useSettingsTabs } from "../../hooks/useSettingsTabs";
import { PageTabs } from "../ui/PageTabs";
export function SettingsTabs() { const location = useLocation(); const navigate = useNavigate(); const tabs = useSettingsTabs(); const activePath = getActiveSettingsTab(location.pathname, tabs)?.path ?? tabs[0]?.path ?? "/profile"; if (!tabs.length) return null; return <PageTabs value={activePath} onChange={navigate} ariaLabel="Settings sections" tabs={tabs.map((item) => ({ value: item.path, label: item.label }))} />; }
