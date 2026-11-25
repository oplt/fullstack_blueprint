import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex h-5 w-fit items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium", {
    variants: {
        variant: {
            default: "border-transparent bg-primary text-primary-foreground",
            secondary: "border-transparent bg-secondary text-secondary-foreground",
            outline: "border-border text-foreground",
            destructive: "border-destructive/40 bg-destructive/10 text-destructive",
            success: "border-success/40 bg-success/10 text-success",
            warning: "border-warning/40 bg-warning/10 text-warning",
            information: "border-information/40 bg-information/10 text-information",
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
