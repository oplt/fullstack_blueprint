import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@/lib/utils";

function Switch({
    className,
    size = "default",
    ...props
}: SwitchPrimitive.Root.Props & { size?: "sm" | "default" }) {
    return (
        <SwitchPrimitive.Root
            data-slot="switch"
            data-size={size}
            className={cn(
                "peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-all outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-checked:bg-primary data-unchecked:bg-input dark:data-unchecked:bg-input/80",
                size === "default" ? "h-5 w-9" : "h-4 w-7",
                className,
            )}
            {...props}
        >
            <SwitchPrimitive.Thumb
                data-slot="switch-thumb"
                className={cn(
                    "pointer-events-none block rounded-full bg-background ring-0 transition-transform",
                    size === "default" ? "size-4" : "size-3",
                    "group-data-[size=default]/switch:data-checked:translate-x-4 group-data-[size=sm]/switch:data-checked:translate-x-3",
                )}
            />
        </SwitchPrimitive.Root>
    );
}

export { Switch };
