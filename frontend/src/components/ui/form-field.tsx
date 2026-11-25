import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { cn } from "@/lib/utils";

type ControlProps = InputHTMLAttributes<HTMLInputElement> & {
    label?: ReactNode;
    description?: ReactNode;
    error?: boolean;
    multiline?: boolean;
    as?: "input" | "textarea" | "select";
    children?: ReactNode;
    inputAttributes?: InputHTMLAttributes<HTMLInputElement>;
    startAdornment?: ReactNode;
    endAdornment?: ReactNode;
    rows?: number;
    minRows?: number;
};

/** Accessible uncontrolled field composition for feature forms. */
export function FormField({
    label,
    description,
    error,
    multiline,
    as = "input",
    children,
    inputAttributes,
    startAdornment,
    endAdornment,
    rows,
    minRows,
    className,
    id,
    ...props
}: ControlProps) {
    const generatedId = useId();
    const controlId = id ?? `field-${generatedId.replaceAll(":", "")}`;
    const messageId = controlId ? `${controlId}-message` : undefined;
    const shared = {
        ...props,
        ...inputAttributes,
        id: controlId,
        "aria-invalid": error || undefined,
        "aria-describedby": description ? messageId : undefined,
        className: cn(className),
    };
    return (
        <div className="grid w-full gap-1.5 text-sm">
            {label ? <label htmlFor={controlId} className="font-medium">{label}</label> : null}
            {as === "select" ? <select {...(shared as SelectHTMLAttributes<HTMLSelectElement>)}>{children}</select> : <div className="flex items-center gap-2 rounded-md border border-input bg-background px-2 focus-within:ring-2 focus-within:ring-ring/40">{startAdornment}<span className="min-w-0 flex-1">{as === "textarea" || multiline ? <Textarea {...(shared as TextareaHTMLAttributes<HTMLTextAreaElement>)} className="border-0 px-0 shadow-none focus-visible:ring-0" rows={rows ?? minRows} /> : <Input {...shared} className="border-0 px-0 shadow-none focus-visible:ring-0" />}</span>{endAdornment}</div>}
            {description ? <span id={messageId} className={error ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>{description}</span> : null}
        </div>
    );
}
