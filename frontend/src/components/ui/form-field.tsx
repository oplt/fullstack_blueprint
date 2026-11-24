import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { cn } from "@/lib/utils";

type ControlProps = InputHTMLAttributes<HTMLInputElement> & {
    label?: ReactNode;
    helperText?: ReactNode;
    error?: boolean;
    multiline?: boolean;
    select?: boolean;
    children?: ReactNode;
    inputProps?: InputHTMLAttributes<HTMLInputElement>;
    InputProps?: { inputProps?: InputHTMLAttributes<HTMLInputElement>; startAdornment?: ReactNode; endAdornment?: ReactNode };
    SelectProps?: SelectHTMLAttributes<HTMLSelectElement>;
    rows?: number;
    minRows?: number;
    fullWidth?: boolean;
    InputLabelProps?: Record<string, unknown>;
};

/** Accessible uncontrolled field composition for feature forms. */
export function FormField({
    label,
    helperText,
    error,
    multiline,
    select,
    children,
    inputProps,
    InputProps,
    SelectProps,
    rows,
    minRows,
    fullWidth: _fullWidth,
    InputLabelProps: _inputLabelProps,
    className,
    id,
    ...props
}: ControlProps) {
    void _fullWidth;
    void _inputLabelProps;
    const controlId = id ?? (typeof label === "string" ? label.toLowerCase().replace(/[^a-z0-9]+/g, "-") : undefined);
    const messageId = controlId ? `${controlId}-message` : undefined;
    const shared = {
        ...props,
        ...inputProps,
        ...(InputProps?.inputProps ?? {}),
        id: controlId,
        "aria-invalid": error || undefined,
        "aria-describedby": messageId,
        className: cn(className),
    };
    return (
        <label className="grid w-full gap-1.5 text-sm">
            {label ? <span className="font-medium">{label}</span> : null}
            {select ? <select {...(shared as SelectHTMLAttributes<HTMLSelectElement>)} {...SelectProps}>{children}</select> : <div className="flex items-center gap-2 rounded-md border border-input bg-background px-2 focus-within:ring-2 focus-within:ring-ring/40">{InputProps?.startAdornment}<span className="min-w-0 flex-1">{multiline ? <Textarea {...(shared as TextareaHTMLAttributes<HTMLTextAreaElement>)} className="border-0 px-0 shadow-none focus-visible:ring-0" rows={rows ?? minRows} /> : <Input {...shared} className="border-0 px-0 shadow-none focus-visible:ring-0" />}</span>{InputProps?.endAdornment}</div>}
            {helperText ? <span id={messageId} className={error ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>{helperText}</span> : null}
        </label>
    );
}
