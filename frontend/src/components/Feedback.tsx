import type { ReactNode } from "react";
import { AlertTriangleIcon, Loader2Icon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmptyStateProps = { icon: ReactNode; title: string; description: string; action?: ReactNode };

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return <div className="ui-empty-state"><div className="ui-empty-content"><div className="ui-empty-icon">{icon}</div><h2 className="ui-empty-title">{title}</h2><p className="ui-empty-description">{description}</p>{action ? <div className="ui-empty-action">{action}</div> : null}</div></div>;
}

export type ErrorStateProps = { title?: string; description?: string; actionLabel?: string; onRetry?: () => void; className?: string };

export function ErrorState({ title = "Something went wrong", description = "We could not load this content. Try again or come back later.", actionLabel = "Try again", onRetry, className }: ErrorStateProps) {
    return <section role="alert" className={cn("ui-error-state", className)}><AlertTriangleIcon className="ui-error-icon" aria-hidden="true" /><h2 className="ui-error-title">{title}</h2><p className="ui-error-description">{description}</p>{onRetry && <Button type="button" variant="outline" onClick={onRetry}><RefreshCwIcon aria-hidden="true" />{actionLabel}</Button>}</section>;
}

export type LoadingStateProps = { label?: string; className?: string; inline?: boolean };

export function LoadingState({ label = "Loading", className, inline = false }: LoadingStateProps) {
    return <div role="status" aria-live="polite" data-inline={inline} className={cn("ui-loading-state", className)}><Loader2Icon className="ui-spinner" aria-hidden="true" /><span>{label}</span></div>;
}
