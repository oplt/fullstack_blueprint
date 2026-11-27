import {Button} from "@/components/ui/button";
import type {ConfigSettingsResponse} from "../../../api/settings";
import {SectionCard} from "../../../components/ui/SectionCard";
import {getQueryErrorMessage} from "../../../utils/queryErrors";
import type {AdminSettingsModel} from "../hooks/useAdminSettingsContent";
import {ConfigEntryEditor} from "./SettingEditors";
import {Badge} from "@/components/ui/badge";

type Props = { configData: ConfigSettingsResponse; model: AdminSettingsModel };

export function ConfigSettingsSection({configData, model}: Props) {
    const group = model.activeConfigGroup;
    if (!group) return null;
    return (
        <SectionCard title={group.label} description={group.description} action={
                                                                             <Button
                                                                                 variant="default"
                                                                                 disabled={model.configMutation.isPending || model.changedConfigCount === 0}
                                                                                 onClick={() => model.configMutation.mutate({
                                                                                     items: configData.items.map((item) => ({
                                                                                         key: item.key,
                                                                                         value: model.configDrafts[item.key] ?? ""
                                                                                     }))
                                                                                 })}
                                                                                 type="button">
                                                                                 {model.configMutation.isPending ? "Saving..." : "Save all config"}
                                                                             </Button>
                                                                         }>
            <div className="flex gap-4">
                <div role="alert" className="rounded-lg border border-border p-3 text-sm">{configData.notice}</div>
                {model.configMutation.isSuccess &&
                    <div role="alert" className="rounded-lg border border-border p-3 text-sm">Config saved. Restart the
                        backend if a startup-bound value changed.</div>}
                {model.configMutation.isError && <div role="alert"
                                                      className="rounded-lg border border-border p-3 text-sm">{getQueryErrorMessage(model.configMutation.error, "Failed to save config.")}</div>}
                <div className="flex flex-wrap gap-ui-xs">
                    <Badge variant="outline">
                        {group.items.length} variables in this group
                    </Badge>

                    <Badge
                        variant={model.changedConfigCount > 0
                            ? "warning"
                            : "outline"}
                    >
                        {model.changedConfigCount > 0
                            ? `${model.changedConfigCount} unsaved changes across all tabs`
                            : "No unsaved config changes"}
                    </Badge>
                </div>
                <div className="gap-3" style={{display: "grid", gridTemplateColumns: "1fr", alignItems: "start"}}>
                    {group.items.map((item) => <ConfigEntryEditor key={item.key} item={item}
                                                                  value={model.configDrafts[item.key] ?? item.value}
                                                                  onChange={(value) => model.setConfigDrafts((current) => ({
                                                                      ...current,
                                                                      [item.key]: value
                                                                  }))}/>)}
                </div>
            </div>
        </SectionCard>
    );
}
