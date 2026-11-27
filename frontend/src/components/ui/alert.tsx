import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const alertVariants = cva("ui-alert", {
    variants: {
        variant: {
            default: "ui-alert-default",
            information: "ui-alert-information",
            success: "ui-alert-success",
            warning: "ui-alert-warning",
            destructive: "ui-alert-destructive",
        },
    },
    defaultVariants: { variant: "default" },
});

function Alert({ className, variant, role = "alert", ...props }: ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
    return <div data-slot="alert" data-variant={variant ?? "default"} role={role} className={cn(alertVariants({ variant }), className)} {...props} />;
}

function AlertTitle({ className, ...props }: ComponentProps<"div">) {
    return <div data-slot="alert-title" className={cn("ui-alert-title", className)} {...props} />;
}

function AlertDescription({ className, ...props }: ComponentProps<"div">) {
    return <div data-slot="alert-description" className={cn("ui-alert-description", className)} {...props} />;
}

export { Alert, AlertDescription, AlertTitle };
