import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type ErrorStateProps = {
  title?: string
  description?: string
  actionLabel?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = "Something went wrong",
  description = "We could not load this content. Try again or come back later.",
  actionLabel = "Try again",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <section
      role="alert"
      className={cn(
        "flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive-soft p-6 text-center",
        className,
      )}
    >
      <AlertTriangleIcon className="size-5 text-destructive-deep" aria-hidden="true" />
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      {onRetry && (
        <Button type="button" variant="outline" onClick={onRetry}>
          <RefreshCwIcon className="mr-2 size-4" aria-hidden="true" />
          {actionLabel}
        </Button>
      )}
    </section>
  );
}
