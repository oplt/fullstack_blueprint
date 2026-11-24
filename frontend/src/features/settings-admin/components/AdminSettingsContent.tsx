import { Button } from "@/components/ui/button";
import { colorMix } from "@/lib/color";import { RestartAlt as RestartIcon, SettingsSuggest as SettingsIcon, Storage as StorageIcon } from "@/components/ui/iconsCompat";
import type { ConfigSettingsResponse, DatabaseSetting } from "../../../api/settings";
import { SettingsTabs } from "../../../components/layout/SettingsTabs";
import { PageShell } from "../../../components/ui/PageShell";
import { StatCard } from "../../../components/ui/StatCard";
import type { SettingsTabValue } from "../settingsModel";
import { useAdminSettingsContent } from "../hooks/useAdminSettingsContent";
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
        <PageShell maxWidth="xl">
            <SettingsTabs />
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr" }}>
                <StatCard label="Config variables" value={props.configData.items.length} description="Environment-backed values available in the settings file" icon={<SettingsIcon />} />
                <StatCard label="Restart-sensitive" value={props.configData.items.filter((item) => item.requires_restart).length} description="Values likely to require a backend restart after saving" icon={<RestartIcon />} color="warning" />
                <StatCard label="Runtime database settings" value={props.databaseSettings.length} description="Key/value records stored in the database for live updates" icon={<StorageIcon />} color="secondary" />
            </div>
            {props.hasConfigError && <div role="alert" className="rounded-lg border border-border p-3 text-sm">{props.configErrorMessage}</div>}
            {props.hasDatabaseError && <div role="alert" className="rounded-lg border border-border p-3 text-sm">{props.databaseErrorMessage}</div>}
            <div style={({
                padding: 8,
                borderRadius: 16,
                border: `1px solid ${"var(--border)"}`,
                backgroundColor: colorMix("var(--card)", 0.82)
            })}>
                <div role="tablist" className="flex gap-1 overflow-x-auto">
                    {model.configGroups.map((group) => <Button key={group.id} variant={model.activeConfigGroup?.id === group.id ? "default" : "outline"} size="sm" onClick={() => props.onTabChange(group.id as SettingsTabValue)} type="button">{group.label}</Button>)}
                </div>
            </div>
            {model.activeConfigGroup
                ? <ConfigSettingsSection configData={props.configData} model={model} />
                : <DatabaseSettingsSections settings={props.databaseSettings} model={model} />}
        </PageShell>
    );
}
