import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { cn } from "@/lib/utils";

type ControlProps = InputHTMLAttributes<HTMLInputElement> & {
    label?: ReactNode;
    description?: ReactNode;
    error?: boolean;
    as?: "input" | "textarea" | "select";
    children?: ReactNode;
    rows?: number;
};

/** Accessible uncontrolled field composition for feature forms. */
export function FormField({
    label,
    description,
    error,
    as = "input",
    children,
    rows,
    className,
    id,
    ...props
}: ControlProps) {
    const generatedId = useId();
    const controlId = id ?? `field-${generatedId.replaceAll(":", "")}`;
    const messageId = controlId ? `${controlId}-message` : undefined;
    const shared = {
        ...props,
        id: controlId,
        "aria-invalid": error || undefined,
        "aria-describedby": description ? messageId : undefined,
        className: cn(className),
    };
    return (
        <div className="grid w-full gap-1.5 text-sm">
            {label ? <label htmlFor={controlId} className="font-medium">{label}</label> : null}
            {as === "select" ? <select {...(shared as SelectHTMLAttributes<HTMLSelectElement>)}>{children}</select> : as === "textarea" ? <Textarea {...(shared as TextareaHTMLAttributes<HTMLTextAreaElement>)} rows={rows} /> : <Input {...shared} />}
            {description ? <span id={messageId} className={error ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>{description}</span> : null}
        </div>
    );
}
