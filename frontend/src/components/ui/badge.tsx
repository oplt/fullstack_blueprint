import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("ui-badge", {
    variants: {
        variant: {
            default: "ui-badge-default",
            secondary: "ui-badge-secondary",
            outline: "ui-badge-outline",
            destructive: "ui-badge-destructive",
            success: "ui-badge-success",
            warning: "ui-badge-warning",
            information: "ui-badge-information",
        },
    },
    defaultVariants: { variant: "default" },
});

function Badge({ className, variant, render, ...props }: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
    return useRender({
        defaultTagName: "span",
        props: mergeProps({ className: cn(badgeVariants({ variant }), className) }, props),
        render,
        state: { variant },
    });
}

export { Badge };
