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
            <div className="flex gap-4">
                <div role="alert" className="rounded-lg border border-border p-3 text-sm">{configData.notice}</div>
                {model.configMutation.isSuccess && <div role="alert" className="rounded-lg border border-border p-3 text-sm">Config saved. Restart the backend if a startup-bound value changed.</div>}
                {model.configMutation.isError && <div role="alert" className="rounded-lg border border-border p-3 text-sm">{getQueryErrorMessage(model.configMutation.error, "Failed to save config.")}</div>}
                <div className="flex flex-row gap-2 flex-wrap">
                    <div
                        className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />
                    <div
                        className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />
                </div>
                <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr", alignItems: "start" }}>
                    {group.items.map((item) => <ConfigEntryEditor key={item.key} item={item}
                        value={model.configDrafts[item.key] ?? item.value}
                        onChange={(value) => model.setConfigDrafts((current) => ({ ...current, [item.key]: value }))} />)}
                </div>
            </div>
        </SectionCard>
    );
}
