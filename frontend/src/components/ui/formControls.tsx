import { useController, useFieldArray, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { Input } from "./input";
import { Textarea } from "./textarea";

type FieldProps<T extends FieldValues> = {
    control: Control<T>;
    name: FieldPath<T>;
    label: string;
    description?: string;
    disabled?: boolean;
};

function FieldMessage({ description, error }: { description?: string; error?: string }) {
    return error ? <p role="alert" className="text-sm text-destructive">{error}</p> : description ? <p className="text-xs text-muted-foreground">{description}</p> : null;
}

export function FormTextField<T extends FieldValues>({ control, name, label, description, disabled, type = "text", placeholder }: FieldProps<T> & { type?: string; placeholder?: string }) {
    const { field, fieldState } = useController({ control, name });
    return <label className="grid gap-1.5 text-sm"><span className="font-medium">{label}</span><Input {...field} type={type} placeholder={placeholder} disabled={disabled} aria-invalid={Boolean(fieldState.error)} aria-describedby={`${String(name)}-message`} /><span id={`${String(name)}-message`}><FieldMessage description={description} error={fieldState.error?.message} /></span></label>;
}

export function FormTextarea<T extends FieldValues>({ control, name, label, description, disabled }: FieldProps<T>) {
    const { field, fieldState } = useController({ control, name });
    return <label className="grid gap-1.5 text-sm"><span className="font-medium">{label}</span><Textarea {...field} disabled={disabled} aria-invalid={Boolean(fieldState.error)} aria-describedby={`${String(name)}-message`} /><span id={`${String(name)}-message`}><FieldMessage description={description} error={fieldState.error?.message} /></span></label>;
}

export function DynamicFieldArray({ control, name, emptyLabel = "Add item", onAppend, renderField }: { control: Control<FieldValues>; name: string; emptyLabel?: string; onAppend: () => unknown; renderField: (index: number, id: string, remove: () => void) => React.ReactNode }) {
    const { fields, append, remove } = useFieldArray({ control, name });
    return <div className="space-y-3">{fields.map((field, index) => <div key={field.id}>{renderField(index, field.id, () => remove(index))}</div>)}<button type="button" className="text-sm font-medium text-primary hover:underline" onClick={() => append(onAppend())}>{emptyLabel}</button></div>;
}

