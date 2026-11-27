import { Button } from "@/components/ui/button";import { FormField } from "@/components/ui/form-field";import { Badge } from "@/components/ui/badge";import { Trash2 } from "lucide-react";
import type { ConfigEntry, DatabaseSetting } from "../../../api/settings";
import { formatDateTime } from "../../../utils/formatters";

export function ConfigEntryEditor({ item, value, onChange }: { item: ConfigEntry; value: string; onChange: (value: string) => void }) {
    return (
        <div className="surface-card ui-feature-surface ui-feature-surface-subtle">
            <div className="flex gap-ui-sm">
                <div className="flex flex-col sm:flex-row gap-ui-xs justify-between">
                    <div>
                        <p>{item.key}</p>
                        {item.description && <p className="text-muted-foreground">{item.description}</p>}
                    </div>
                    <div className="flex flex-row gap-ui-xs flex-wrap">
                        <Badge variant={item.is_secret ? "warning" : "outline"}>{item.is_secret ? "Secret" : item.value_type}</Badge>
                        {item.is_custom && <Badge variant="secondary">Custom</Badge>}
                        {item.requires_restart && <Badge variant="warning">Restart required</Badge>}
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
        <div className="surface-card ui-feature-surface">
            <div className="flex gap-ui-sm">
                <div className="flex flex-row gap-ui-sm justify-between">
                    <div><p>{item.key}</p><span className="text-muted-foreground">Updated {formatDateTime(item.updated_at)}</span></div>
                    <Button size="icon" aria-label={`Delete ${item.key}`} onClick={onDelete} disabled={isDeleting}><Trash2 /></Button>
                </div>
                <FormField
                    label="Value"
                    value={draft.value}
                    onChange={(event: any) => onDraftChange({ ...draft, value: event.target.value })}
                    as="textarea"
                    rows={3} />
                <FormField
                    label="Description"
                    value={draft.description}
                    onChange={(event: any) => onDraftChange({ ...draft, description: event.target.value })}
                    as="textarea"
                    rows={3} />
                <Button variant="default" disabled={isSaving} onClick={onSave} type="button">{isSaving ? "Saving..." : "Save setting"}</Button>
            </div>
        </div>
    );
}
