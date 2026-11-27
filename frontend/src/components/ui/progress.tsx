import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import { cn } from "@/lib/utils";
function Progress({ className, value, ...props }: Omit<ProgressPrimitive.Root.Props, "value"> & { value?: number | null }) {
    return <ProgressPrimitive.Root value={value ?? null} className={cn("ui-progress", className)} {...props}>
        <ProgressPrimitive.Track className="ui-progress-track"><ProgressPrimitive.Indicator className="ui-progress-indicator" /></ProgressPrimitive.Track>
    </ProgressPrimitive.Root>;
}
export { Progress };
