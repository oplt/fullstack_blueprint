import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsPanel, TabsTrigger } from "@/components/ui/tabs";
import { RotateCcw, Settings2, HardDrive } from "lucide-react";
import { getConfigSettings, listDatabaseSettings } from "@/features/admin/settingsApi";
import type { ConfigSettingsResponse, DatabaseSetting } from "@/features/admin/settingsApi";
import { queryKeys } from "../../lib/queryKeys";
import { SettingsTabs } from "../../app/SettingsTabs";
import { MetricGrid } from "../../components/Metrics";
import { PageShell } from "../../components/PageLayout";
import { StatCard } from "../../components/Metrics";
import { QueryErrorAlert } from "../../components/ui/QueryBoundary";
import { getQueryErrorMessage } from "../../lib/queryErrors";
import { buildConfigGroups, settingsContentKey, type SettingsTabValue } from "./settingsModel";
import { useAdminSettingsContent } from "./useAdminSettingsContent";
import { ConfigSettingsSection } from "./ConfigSettingsSection";
import { DatabaseSettingsSections } from "./DatabaseSettingsSections";

type AdminSettingsContentProps = {
    configData: ConfigSettingsResponse; databaseSettings: DatabaseSetting[];
    configErrorMessage: string; databaseErrorMessage: string;
    hasConfigError: boolean; hasDatabaseError: boolean;
    activeTab: SettingsTabValue; onTabChange: (tab: SettingsTabValue) => void;
};

function AdminSettingsContent(props: AdminSettingsContentProps) {
    const model = useAdminSettingsContent(props.configData, props.databaseSettings, props.activeTab);
    return (
        <PageShell width="wide">
            <SettingsTabs />
            <MetricGrid columns={3}>
                <StatCard label="Config variables" value={props.configData.items.length} description="Environment-backed values available in the settings file" icon={<Settings2 />} />
                <StatCard label="Restart-sensitive" value={props.configData.items.filter((item) => item.requires_restart).length} description="Values likely to require a backend restart after saving" icon={<RotateCcw />} color="warning" />
                <StatCard label="Runtime database settings" value={props.databaseSettings.length} description="Key/value records stored in the database for live updates" icon={<HardDrive />} color="secondary" />
            </MetricGrid>
            {props.hasConfigError && <div role="alert" className="rounded-lg border border-border p-ui-sm text-body-md">{props.configErrorMessage}</div>}
            {props.hasDatabaseError && <div role="alert" className="rounded-lg border border-border p-ui-sm text-body-md">{props.databaseErrorMessage}</div>}
            <Tabs
                value={props.activeTab}
                onValueChange={(value) => {
                    const nextTab = value === "database"
                        ? value
                        : model.configGroups.find((group) => group.id === value)?.id;
                    if (nextTab) props.onTabChange(nextTab);
                }}
                className="min-w-0"
            >
                <TabsList variant="line" aria-label="Settings category" className="mb-ui-md max-w-full overflow-x-auto border-b border-border">
                    {model.configGroups.map((group) => (
                        <TabsTrigger key={group.id} value={group.id} className="shrink-0 px-ui-sm py-ui-xs">
                            {group.label}
                        </TabsTrigger>
                    ))}
                    <TabsTrigger value="database" className="shrink-0 px-ui-sm py-ui-xs">Database</TabsTrigger>
                </TabsList>
                {model.configGroups.map((group) => (
                    <TabsPanel key={group.id} value={group.id}>
                        {props.activeTab === group.id ? <ConfigSettingsSection configData={props.configData} model={model} /> : null}
                    </TabsPanel>
                ))}
                <TabsPanel value="database">
                    {props.activeTab === "database" ? <DatabaseSettingsSections settings={props.databaseSettings} model={model} /> : null}
                </TabsPanel>
            </Tabs>
        </PageShell>
    );
}

export default function AdminSettingsPage() {
    const [activeTab, setActiveTab] = useState<SettingsTabValue>("application");
    const config = useQuery({ queryKey: queryKeys.settings.config, queryFn: ({ signal }) => getConfigSettings({ signal }) });
    const database = useQuery({ queryKey: queryKeys.settings.database, queryFn: ({ signal }) => listDatabaseSettings({ signal }) });
    if ((config.isLoading && !config.data) || (database.isLoading && !database.data)) return <PageShell width="wide"><div className="flex gap-ui-md"><div className="animate-pulse rounded-md bg-muted rounded-lg" /><div className="animate-pulse rounded-md bg-muted rounded-lg" /></div></PageShell>;
    if (!config.data) return <PageShell width="wide"><SettingsTabs /><div className="mt-ui-md flex gap-ui-md"><QueryErrorAlert error={config.error ?? new Error("Failed to load config values.")} fallback="Failed to load config values." title="Config" onRetry={() => void config.refetch()} />{database.isError && <QueryErrorAlert error={database.error} fallback="Failed to load database settings." title="Database settings" onRetry={() => void database.refetch()} />}</div></PageShell>;
    const settings = database.data ?? [];
    const groups = buildConfigGroups(config.data.items);
    const resolvedTab = activeTab === "database" || groups.some((group) => group.id === activeTab) ? activeTab : groups[0]?.id ?? "database";
    return <AdminSettingsContent key={settingsContentKey(config.data, settings)} configData={config.data} databaseSettings={settings} configErrorMessage={getQueryErrorMessage(config.error, "Failed to load config values.")} databaseErrorMessage={getQueryErrorMessage(database.error, "Failed to load database settings.")} hasConfigError={config.isError} hasDatabaseError={database.isError || !database.data} activeTab={resolvedTab} onTabChange={setActiveTab} />;
}
