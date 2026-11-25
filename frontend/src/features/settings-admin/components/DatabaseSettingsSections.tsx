import { Button } from "@/components/ui/button";import { FormField } from "@/components/ui/form-field";
import { HardDrive as StorageIcon } from "lucide-react";
import type { DatabaseSetting } from "../../../api/settings";
import { EmptyState } from "../../../components/ui/EmptyState";
import { SectionCard } from "../../../components/ui/SectionCard";
import { getQueryErrorMessage } from "../../../utils/queryErrors";
import type { AdminSettingsModel } from "../hooks/useAdminSettingsContent";
import { DatabaseSettingEditor } from "./SettingEditors";

export function DatabaseSettingsSections({ settings, model }: { settings: DatabaseSetting[]; model: AdminSettingsModel }) {
    const create = model.createDatabaseMutation;
    return (
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr", alignItems: "start" }}>
            <SectionCard title="Add database setting" description="Store arbitrary key/value settings inside the database.">
                <div className="flex gap-4">
                    {create.isSuccess && <div role="alert" className="rounded-lg border border-border p-3 text-sm">Database setting created.</div>}
                    {create.isError && <div role="alert" className="rounded-lg border border-border p-3 text-sm">{getQueryErrorMessage(create.error, "Failed to create database setting.")}</div>}
                    <FormField
                        label="Key"
                        value={model.newSetting.key}
                        onChange={(event: any) => model.setNewSetting((current) => ({ ...current, key: event.target.value }))} />
                    <FormField
                        label="Value"
                        value={model.newSetting.value}
                        onChange={(event: any) => model.setNewSetting((current) => ({ ...current, value: event.target.value }))}
                        as="textarea"
                        rows={3} />
                    <FormField
                        label="Description"
                        value={model.newSetting.description}
                        onChange={(event: any) => model.setNewSetting((current) => ({ ...current, description: event.target.value }))}
                        as="textarea"
                        rows={3} />
                    <Button
                        variant="default"
                        disabled={create.isPending || !model.newSetting.key.trim()}
                        onClick={() => create.mutate({ key: model.newSetting.key.trim(), value: model.newSetting.value, description: model.newSetting.description || undefined })}
                        type="button">
                        {create.isPending ? "Adding..." : "Add setting"}
                    </Button>
                </div>
            </SectionCard>
            <SectionCard title="Database settings" description="Review, edit, and delete runtime settings stored in the database.">
                {settings.length > 0 ? <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr", alignItems: "start" }}>
                    {settings.map((item) => {
                        const draft = model.databaseDrafts[item.id] ?? { value: item.value, description: item.description ?? "" };
                        return <DatabaseSettingEditor key={item.id} item={item} draft={draft}
                            onDraftChange={(next) => model.setDatabaseDrafts((current) => ({ ...current, [item.id]: next }))}
                            onSave={() => model.updateDatabaseMutation.mutate({ id: item.id, ...draft })}
                            onDelete={() => model.deleteDatabaseMutation.mutate(item.id)}
                            isSaving={model.updateDatabaseMutation.isPending && model.updateDatabaseMutation.variables?.id === item.id}
                            isDeleting={model.deleteDatabaseMutation.isPending && model.deleteDatabaseMutation.variables === item.id} />;
                    })}
                </div> : <EmptyState icon={<StorageIcon />} title="No database settings yet" description="Create a setting when you need runtime-configurable values stored in the database." />}
            </SectionCard>
        </div>
    );
}
