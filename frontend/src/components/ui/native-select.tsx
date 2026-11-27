import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function NativeSelect({ className, ...props }: ComponentProps<"select">) {
    return (
        <select
            data-slot="native-select"
            className={cn("ui-native-select", className)}
            {...props}
        />
    );
}

export { NativeSelect };
