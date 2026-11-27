import { Button } from "@/components/ui/button";import type { ConfigSettingsResponse } from "../../../api/settings";
import { SectionCard } from "../../../components/ui/SectionCard";
import { getQueryErrorMessage } from "../../../utils/queryErrors";
import type { AdminSettingsModel } from "../hooks/useAdminSettingsContent";
import { ConfigEntryEditor } from "./SettingEditors";

type Props = { configData: ConfigSettingsResponse; model: AdminSettingsModel };

export function ConfigSettingsSection({ configData, model }: Props) {
    const group = model.activeConfigGroup;
    if (!group) return null;
    return (
        <SectionCard title={group.label} description={group.description} action={
            <Button
                variant="default"
                disabled={model.configMutation.isPending || model.changedConfigCount === 0}
                onClick={() => model.configMutation.mutate({ items: configData.items.map((item) => ({ key: item.key, value: model.configDrafts[item.key] ?? "" })) })}
                type="button">
                {model.configMutation.isPending ? "Saving..." : "Save all config"}
            </Button>
        }>
            <div className="flex gap-ui-md">
                <div role="alert" className="ui-auto-config-settings-section-div">{configData.notice}</div>
                {model.configMutation.isSuccess && <div role="alert" className="ui-auto-config-settings-section-div-bac2659">Config saved. Restart the backend if a startup-bound value changed.</div>}
                {model.configMutation.isError && <div role="alert" className="ui-auto-config-settings-section-div-bac2659-x">{getQueryErrorMessage(model.configMutation.error, "Failed to save config.")}</div>}
                <div className="flex flex-row flex-wrap gap-ui-xs">
                    <div
                        className="inline-flex items-center ui-auto-config-settings-section-div-7c6ee7c" />
                    <div
                        className="inline-flex items-center ui-auto-config-settings-section-div-7c6ee7c-x" />
                </div>
                <div className="gap-ui-sm" style={{ display: "grid", gridTemplateColumns: "1fr", alignItems: "start" }}>
                    {group.items.map((item) => <ConfigEntryEditor key={item.key} item={item}
                        value={model.configDrafts[item.key] ?? item.value}
                        onChange={(value) => model.setConfigDrafts((current) => ({ ...current, [item.key]: value }))} />)}
                </div>
            </div>
        </SectionCard>
    );
}
