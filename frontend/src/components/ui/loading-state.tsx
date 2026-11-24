import { Loader2Icon } from "lucide-react"

import { cn } from "@/lib/utils"

export type LoadingStateProps = {
  label?: string
  className?: string
  inline?: boolean
}

export function LoadingState({
  label = "Loading",
  className,
  inline = false,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center justify-center gap-2 text-sm text-muted-foreground",
        inline ? "inline-flex" : "min-h-24 w-full",
        className,
      )}
    >
      <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
