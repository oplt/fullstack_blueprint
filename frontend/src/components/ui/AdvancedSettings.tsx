import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
type AdvancedSettingsProps = { children: ReactNode; title?: string; description?: string; defaultExpanded?: boolean; disabled?: boolean; className?: string };
export function AdvancedSettings({ children, title = "Advanced settings", description, defaultExpanded = false, disabled = false, className }: AdvancedSettingsProps) {
    const id = useId();
    const [expanded, setExpanded] = useState(defaultExpanded);

    return (
        <section className={cn("rounded-lg border border-border bg-transparent", className)}>
            <Button
                variant="ghost"
                type="button"
                id={`${id}-header`}
                aria-controls={`${id}-content`}
                aria-expanded={expanded}
                disabled={disabled}
                onClick={() => setExpanded((value) => !value)}
                className="min-h-12 w-full justify-start px-3 text-left text-sm font-semibold"
            >
                <span>{title}</span>
                {description ? <span className="font-normal text-muted-foreground">{description}</span> : null}
                <ChevronDown className={cn("ml-auto size-4 transition-transform", expanded && "rotate-180")} aria-hidden="true" />
            </Button>
            <div id={`${id}-content`} role="region" aria-labelledby={`${id}-header`} hidden={!expanded} className="px-3 pb-3">
                {children}
            </div>
        </section>
    );
}
