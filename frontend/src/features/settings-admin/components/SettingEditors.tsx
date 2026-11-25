import { Button } from "@/components/ui/button";import { FormField } from "@/components/ui/form-field";import { colorMix } from "@/lib/color";import { Trash2 as DeleteIcon } from "lucide-react";
import type { ConfigEntry, DatabaseSetting } from "../../../api/settings";
import { formatDateTime } from "../../../utils/formatters";

export function ConfigEntryEditor({ item, value, onChange }: { item: ConfigEntry; value: string; onChange: (value: string) => void }) {
    return (
        <div style={({
            padding: 16,
            borderRadius: 16,
            border: `1px solid ${"var(--border)"}`,
            backgroundColor: colorMix("var(--card)", 0.78)
        })}>
            <div className="flex gap-[10px]">
                <div className="flex flex-col sm:flex-row gap-[8px] justify-between">
                    <div>
                        <p>{item.key}</p>
                        {item.description && <p className="text-muted-foreground">{item.description}</p>}
                    </div>
                    <div className="flex flex-row gap-[8px] flex-wrap">
                        <div
                            className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />
                        {item.is_custom && <div
                            className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />}
                        {item.requires_restart && <div
                            className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />}
                    </div>
                </div>
                <FormField
                    type={item.is_secret ? "password" : "text"}
                    value={value}
                    onChange={(event: any) => onChange(event.target.value)}
                    description={item.is_secret ? "Stored value is masked. Enter a new value to replace it." : undefined} />
            </div>
        </div>
    );
}

type DatabaseEditorProps = {
    item: DatabaseSetting;
    draft: { value: string; description: string };
    onDraftChange: (draft: { value: string; description: string }) => void;
    onSave: () => void;
    onDelete: () => void;
    isSaving: boolean;
    isDeleting: boolean;
};

export function DatabaseSettingEditor({ item, draft, onDraftChange, onSave, onDelete, isSaving, isDeleting }: DatabaseEditorProps) {
    return (
        <div style={({
            padding: 18,
            borderRadius: 16,
            border: `1px solid ${"var(--border)"}`
        })}>
            <div className="flex gap-[12px]">
                <div className="flex flex-row gap-[12px] justify-between">
                    <div><p>{item.key}</p><span className="text-muted-foreground">Updated {formatDateTime(item.updated_at)}</span></div>
                    <Button size="icon" aria-label={`Delete ${item.key}`} onClick={onDelete} disabled={isDeleting}><DeleteIcon /></Button>
                </div>
                <FormField
                    label="Value"
                    value={draft.value}
                    onChange={(event: any) => onDraftChange({ ...draft, value: event.target.value })}
                    multiline
                    rows={3} />
                <FormField
                    label="Description"
                    value={draft.description}
                    onChange={(event: any) => onDraftChange({ ...draft, description: event.target.value })}
                    multiline
                    rows={3} />
                <Button variant="default" disabled={isSaving} onClick={onSave} type="button">{isSaving ? "Saving..." : "Save setting"}</Button>
            </div>
        </div>
    );
}
