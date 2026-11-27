import { useMemo } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
export function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) { return <fieldset data-slot="field-set" className={cn("ui-field-set", className)} {...props} />; }
export function FieldLegend({ className, variant = "legend", ...props }: React.ComponentProps<"legend"> & { variant?: "legend" | "label" }) { return <legend data-slot="field-legend" data-variant={variant} className={cn("ui-field-legend", className)} {...props} />; }
export function FieldGroup({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="field-group" className={cn("group/field-group @container/field-group ui-field-group", className)} {...props} />; }
const fieldVariants = cva("group/field ui-field", { variants: { orientation: { vertical: "ui-field-vertical", horizontal: "ui-field-horizontal", responsive: "ui-field-responsive" } }, defaultVariants: { orientation: "vertical" } });
export function Field({ className, orientation = "vertical", ...props }: React.ComponentProps<"div"> & VariantProps<typeof fieldVariants>) { return <div role="group" data-slot="field" data-orientation={orientation} className={cn(fieldVariants({ orientation }), className)} {...props} />; }
export function FieldContent({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="field-content" className={cn("group/field-content ui-field-content", className)} {...props} />; }
export function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) { return <Label data-slot="field-label" className={cn("group/field-label peer/field-label ui-field-label", className)} {...props} />; }
export function FieldTitle({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="field-label" className={cn("ui-field-title", className)} {...props} />; }
export function FieldDescription({ className, ...props }: React.ComponentProps<"p">) { return <p data-slot="field-description" className={cn("ui-field-description", className)} {...props} />; }
export function FieldSeparator({ children, className, ...props }: React.ComponentProps<"div"> & { children?: React.ReactNode }) { return <div data-slot="field-separator" data-content={!!children} className={cn("ui-field-separator", className)} {...props}><Separator className="ui-field-separator-line" />{children && <span className="ui-field-separator-content" data-slot="field-separator-content">{children}</span>}</div>; }
function FieldError({ className, children, errors, ...props }: React.ComponentProps<"div"> & { errors?: Array<{ message?: string } | undefined> }) {
    const content = useMemo(() => {
        if (children) return children;
        if (!errors?.length) return null;
        const uniqueErrors = [...new Map(errors.map((error) => [error?.message, error])).values()];
        if (uniqueErrors.length == 1) return uniqueErrors[0]?.message;
        return <ul className="ui-field-error-list">{uniqueErrors.map((error, index) => error?.message && <li key={index}>{error.message}</li>)}</ul>;
    }, [children, errors]);
    if (!content) return null;
    return <div role="alert" data-slot="field-error" className={cn("ui-field-error", className)} {...props}>{content}</div>;
}
export { FieldError };
