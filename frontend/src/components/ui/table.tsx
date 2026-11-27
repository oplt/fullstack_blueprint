import * as React from "react"
import { cn } from "@/lib/utils"

type TableProps = React.ComponentProps<"table"> & {
  density?: "compact" | "comfortable"
}

function Table({ className, density = "comfortable", ...props }: TableProps) {
  return (
    <table
      data-slot="table"
      data-density={density}
      className={cn(
        "w-full border-collapse text-sm data-[density=compact]:[--table-cell-padding:var(--table-cell-padding-compact)] data-[density=comfortable]:[--table-cell-padding:var(--table-cell-padding-comfortable)]",
        className,
      )}
      {...props}
    />
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={cn(className)} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={cn(className)} {...props} />
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return <tr data-slot="table-row" className={cn(className)} {...props} />
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "border-b border-border px-3 py-(--table-cell-padding) text-left align-middle font-medium whitespace-nowrap text-muted-foreground",
        className,
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("px-3 py-(--table-cell-padding) align-middle", className)}
      {...props}
    />
  )
}

export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow }
