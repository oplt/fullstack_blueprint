import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
export type LoadingStateProps = { label?: string; className?: string; inline?: boolean };
export function LoadingState({ label = "Loading", className, inline = false }: LoadingStateProps) { return <div role="status" aria-live="polite" data-inline={inline} className={cn("ui-loading-state", className)}><Loader2Icon className="ui-spinner" aria-hidden="true" /><span>{label}</span></div>; }
