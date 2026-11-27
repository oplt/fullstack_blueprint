import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function NativeSelect({ className, ...props }: ComponentProps<"select">) {
    return (
        <select
            data-slot="native-select"
            className={cn(
                "form-control h-(--control-height) focus-visible:outline-none",
                className,
            )}
            {...props}
        />
    );
}

export { NativeSelect };
