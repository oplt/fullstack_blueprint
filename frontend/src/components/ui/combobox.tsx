import * as React from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { cn } from "@/lib/utils";
import { inputClassName } from "@/components/ui/input";
function Combobox<Value, Multiple extends boolean | undefined = false, Item = Value>(props: ComboboxPrimitive.Root.Props<Value, Multiple, Item>) { return <ComboboxPrimitive.Root {...props} />; }
function ComboboxInputGroup({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="combobox-input-group" className={cn("ui-combobox-input-group", className)} {...props} />; }
function ComboboxInput({ className, ...props }: ComboboxPrimitive.Input.Props) { return <ComboboxPrimitive.Input data-slot="combobox-input" className={cn(inputClassName, className)} {...props} />; }
function ComboboxContent({ className, align = "start", alignOffset = 0, side = "bottom", sideOffset = 4, ...props }: ComboboxPrimitive.Popup.Props & Pick<ComboboxPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset">) {
    return <ComboboxPrimitive.Portal><ComboboxPrimitive.Positioner align={align} alignOffset={alignOffset} side={side} sideOffset={sideOffset} className="ui-floating-positioner ui-combobox-positioner"><ComboboxPrimitive.Popup data-slot="combobox-content" className={cn("ui-floating ui-combobox-content", className)} {...props} /></ComboboxPrimitive.Positioner></ComboboxPrimitive.Portal>;
}
function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) { return <ComboboxPrimitive.List data-slot="combobox-list" className={cn("ui-combobox-list", className)} {...props} />; }
function ComboboxItem({ className, ...props }: ComboboxPrimitive.Item.Props) { return <ComboboxPrimitive.Item data-slot="combobox-item" className={cn("ui-combobox-item", className)} {...props} />; }
function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) { return <ComboboxPrimitive.Empty data-slot="combobox-empty" className={cn("ui-combobox-empty", className)} {...props} />; }
export { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxInputGroup, ComboboxItem, ComboboxList };
