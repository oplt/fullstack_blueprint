import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getConfigSettings, listDatabaseSettings } from "../../../api/settings";
import { queryKeys } from "../../../config/queryKeys";
import { SettingsTabs } from "../../../components/layout/SettingsTabs";
import { PageShell } from "../../../components/ui/PageShell";
import { QueryErrorAlert } from "../../../components/ui/QueryBoundary";
import { getQueryErrorMessage } from "../../../utils/queryErrors";
import { AdminSettingsContent } from "../components/AdminSettingsContent";
import { buildConfigGroups, settingsContentKey, type SettingsTabValue } from "../settingsModel";

export default function AdminSettingsPage() {
    const [activeTab, setActiveTab] = useState<SettingsTabValue>("application");
    const config = useQuery({ queryKey: queryKeys.settings.config, queryFn: ({ signal }) => getConfigSettings({ signal }) });
    const database = useQuery({ queryKey: queryKeys.settings.database, queryFn: ({ signal }) => listDatabaseSettings({ signal }) });
    if ((config.isLoading && !config.data) || (database.isLoading && !database.data)) {
        return (
            <PageShell width="wide"><div className="flex gap-4"><div
                    style={{ borderRadius: 24 }}
                    className="animate-pulse rounded-md bg-muted" /><div
                    style={{ borderRadius: 24 }}
                    className="animate-pulse rounded-md bg-muted" /></div></PageShell>
        );
    }
    if (!config.data) {
        return (
            <PageShell width="wide"><SettingsTabs /><div className="mt-4 flex gap-4">
                    <QueryErrorAlert error={config.error ?? new Error("Failed to load config values.")} fallback="Failed to load config values." title="Config" onRetry={() => void config.refetch()} />
                    {database.isError && <QueryErrorAlert error={database.error} fallback="Failed to load database settings." title="Database settings" onRetry={() => void database.refetch()} />}
                </div></PageShell>
        );
    }
    const settings = database.data ?? [];
    const groups = buildConfigGroups(config.data.items);
    const resolvedTab = activeTab === "database" || groups.some((group) => group.id === activeTab) ? activeTab : groups[0]?.id ?? "database";
    return <AdminSettingsContent key={settingsContentKey(config.data, settings)} configData={config.data} databaseSettings={settings}
        configErrorMessage={getQueryErrorMessage(config.error, "Failed to load config values.")}
        databaseErrorMessage={getQueryErrorMessage(database.error, "Failed to load database settings.")}
        hasConfigError={config.isError} hasDatabaseError={database.isError || !database.data}
        activeTab={resolvedTab} onTabChange={setActiveTab} />;
}
