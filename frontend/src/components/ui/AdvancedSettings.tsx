import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
type AdvancedSettingsProps = { children: ReactNode; title?: string; description?: string; defaultExpanded?: boolean; disabled?: boolean; className?: string };
export function AdvancedSettings({ children, title = "Advanced settings", description, defaultExpanded = false, disabled = false, className }: AdvancedSettingsProps) {
    const id = useId();
    const [expanded, setExpanded] = useState(defaultExpanded);
    return <section className={cn("ui-advanced-settings", className)}><Button variant="ghost" type="button" id={`${id}-header`} aria-controls={`${id}-content`} aria-expanded={expanded} disabled={disabled} onClick={() => setExpanded((value) => !value)} className="ui-advanced-settings-trigger"><span>{title}</span>{description ? <span className="ui-muted-copy">{description}</span> : null}<ChevronDown className="ui-advanced-settings-chevron" data-expanded={expanded} aria-hidden="true" /></Button><div id={`${id}-content`} role="region" aria-labelledby={`${id}-header`} hidden={!expanded} className="ui-advanced-settings-content">{children}</div></section>;
}
