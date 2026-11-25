import { Info, CircleHelp } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { getHelpTerm, type HelpTermId } from "../../config/helpText";
type HelpTooltipProps = { termId?: HelpTermId | string; title?: ReactNode; detail?: ReactNode; variant?: "help" | "info" | "label"; children?: ReactNode; forcePopover?: boolean };
export function HelpTooltip({ termId, title, detail, variant = "help", children, forcePopover = false }: HelpTooltipProps) {
    const id = useId();
    const [open, setOpen] = useState(false);
    const [hovered, setHovered] = useState(false);
    const term = termId ? getHelpTerm(termId as HelpTermId) : null;
    const shortText = title ?? term?.definition ?? null;
    const longText = detail ?? term?.detail ?? null;
    const heading = term?.title;
    if (!shortText && !longText) return variant === "label" ? <>{children}</> : null;
    const icon = variant === "info" ? <Info className="size-3.5" /> : <CircleHelp className="size-3.5" />;
    const trigger = <button type="button" aria-label={heading ? "About " + heading : "About this term"} className="inline-flex items-center p-0.5 text-muted-foreground hover:text-foreground" onClick={longText || forcePopover ? () => setOpen((v) => !v) : undefined}>{icon}</button>;
    const popover = longText || forcePopover ? <Popover open={open} onOpenChange={setOpen}><PopoverTrigger render={trigger} /><PopoverContent aria-label={heading ? undefined : "Help details"}><div className="space-y-1.5">{heading ? <h3 id={id + "-title"} className="font-semibold">{heading}</h3> : null}{shortText ? <p>{shortText}</p> : null}{longText ? <p className="text-muted-foreground">{longText}</p> : null}</div></PopoverContent></Popover> : null;
    const control = <span className="relative inline-flex" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>{popover ?? trigger}{hovered ? <span role="tooltip" className="sr-only">{shortText}</span> : null}</span>;
    return variant === "label" ? <span className="inline-flex max-w-full items-center gap-1"><span className="min-w-0">{children}</span>{control}</span> : <>{children}{control}</>;
}
export function HelpFieldLabel({ termId, children }: { termId: HelpTermId | string; children: ReactNode }) { return <HelpTooltip termId={termId} variant="label">{children}</HelpTooltip>; }
