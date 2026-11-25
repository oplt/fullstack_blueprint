import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import { cn } from "@/lib/utils";

function Progress({ className, value, ...props }: Omit<ProgressPrimitive.Root.Props, "value"> & { value?: number | null }) {
    return <ProgressPrimitive.Root value={value ?? null} className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)} {...props}>
        <ProgressPrimitive.Track className="size-full">
            <ProgressPrimitive.Indicator className="h-full bg-primary transition-all" />
        </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>;
}

export { Progress };
