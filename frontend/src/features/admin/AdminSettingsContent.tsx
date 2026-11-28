import { Tabs, TabsList, TabsPanel, TabsTrigger } from "@/components/ui/tabs";
import { RotateCcw, Settings2, HardDrive } from "lucide-react";
import type { ConfigSettingsResponse, DatabaseSetting } from "@/features/admin/settingsApi";
import { SettingsTabs } from "../../app/SettingsTabs";
import { MetricGrid } from "../../components/ui/MetricGrid";
import { PageShell } from "../../components/ui/PageShell";
import { StatCard } from "../../components/ui/StatCard";
import type { SettingsTabValue } from "./settingsModel";
import { useAdminSettingsContent } from "./useAdminSettingsContent";
import { ConfigSettingsSection } from "./ConfigSettingsSection";
import { DatabaseSettingsSections } from "./DatabaseSettingsSections";

type Props = {
    configData: ConfigSettingsResponse; databaseSettings: DatabaseSetting[];
    configErrorMessage: string; databaseErrorMessage: string;
    hasConfigError: boolean; hasDatabaseError: boolean;
    activeTab: SettingsTabValue; onTabChange: (tab: SettingsTabValue) => void;
};

export function AdminSettingsContent(props: Props) {
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
