import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
    return <CheckboxPrimitive.Root data-slot="checkbox" className={cn("peer ui-checkbox", className)} {...props}>
        <CheckboxPrimitive.Indicator className="ui-checkbox-indicator"><Check aria-hidden="true" /></CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>;
}
export { Checkbox };
