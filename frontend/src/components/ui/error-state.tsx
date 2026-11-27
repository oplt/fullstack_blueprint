import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
export type ErrorStateProps = { title?: string; description?: string; actionLabel?: string; onRetry?: () => void; className?: string };
export function ErrorState({ title = "Something went wrong", description = "We could not load this content. Try again or come back later.", actionLabel = "Try again", onRetry, className }: ErrorStateProps) {
    return <section role="alert" className={cn("ui-error-state", className)}><AlertTriangleIcon className="ui-error-icon" aria-hidden="true" /><h2 className="ui-error-title">{title}</h2><p className="ui-error-description">{description}</p>{onRetry && <Button type="button" variant="outline" onClick={onRetry}><RefreshCwIcon aria-hidden="true" />{actionLabel}</Button>}</section>;
}
