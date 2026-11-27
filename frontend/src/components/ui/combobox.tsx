import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"
import { cn } from "@/lib/utils"
import { inputClassName } from "@/components/ui/input"

function Combobox<Value, Multiple extends boolean | undefined = false, Item = Value>(
  props: ComboboxPrimitive.Root.Props<Value, Multiple, Item>,
) {
  return <ComboboxPrimitive.Root {...props} />
}

function ComboboxInputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="combobox-input-group" className={cn("relative flex w-full items-center", className)} {...props} />
}

function ComboboxInput({ className, ...props }: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-input"
      className={cn(inputClassName, className)}
      {...props}
    />
  )
}

function ComboboxContent({
  className,
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  ...props
}: ComboboxPrimitive.Popup.Props & Pick<
  ComboboxPrimitive.Positioner.Props,
  "align" | "alignOffset" | "side" | "sideOffset"
>) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="z-(--z-popover) w-(--anchor-width)"
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          className={cn(
            "overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-overlay outline-none",
            className,
          )}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  )
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn("max-h-[320px] overflow-y-auto p-1", className)}
      {...props}
    />
  )
}

function ComboboxItem({ className, ...props }: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "flex min-w-0 cursor-default items-center gap-3 rounded-sm px-3 py-2.5 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  )
}

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn("px-4 py-6 text-center text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxList,
}
