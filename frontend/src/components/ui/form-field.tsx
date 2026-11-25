import { useId, type ComponentProps, type ReactNode } from "react";
import { Field, FieldDescription, FieldError, FieldLabel } from "./field";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { cn } from "@/lib/utils";

type NativeControl =
    | ({ as?: "input" } & ComponentProps<"input">)
    | ({ as: "select" } & ComponentProps<"select">)
    | ({ as: "textarea" } & ComponentProps<"textarea">);

type ControlProps = NativeControl & {
    label?: ReactNode;
    description?: ReactNode;
    error?: boolean;
};

function Control(props: NativeControl) {
    if (props.as === "select") {
        const { as: Select, className, ...select } = props;
        return <Select {...select} className={cn("form-control h-10", className)} />;
    }
    if (props.as === "textarea") {
        const { as: slot, ...textarea } = props;
        return <Textarea data-slot={slot} {...textarea} />;
    }
    const { as: slot = "input", ...input } = props;
    return <Input data-slot={slot} {...input} />;
}

export function FormField({ label, description, error, id, ...props }: ControlProps) {
    const generatedId = useId();
    const controlId = id ?? generatedId;
    const messageId = description ? `${controlId}-message` : undefined;
    const ids = [props["aria-describedby"], messageId].filter(Boolean).join(" ").trim().split(/\s+/);
    const invalid = error || props["aria-invalid"];
    return (
        <Field data-invalid={invalid}>
            {label && <FieldLabel htmlFor={controlId}>{label}</FieldLabel>}
            <Control
                {...props}
                id={controlId}
                aria-describedby={[...new Set(ids)].join(" ") || undefined}
                aria-invalid={invalid}
            />
            {description && (error
                ? <FieldError id={messageId}>{description}</FieldError>
                : <FieldDescription id={messageId}>{description}</FieldDescription>)}
        </Field>
    );
}
