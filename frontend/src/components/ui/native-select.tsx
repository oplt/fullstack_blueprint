import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function NativeSelect({ className, ...props }: ComponentProps<"select">) {
    return (
        <select
            data-slot="native-select"
            className={cn(
                "min-h-10 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
                className,
            )}
            {...props}
        />
    );
}

export { NativeSelect };
