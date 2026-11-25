import { Info, CircleHelp } from "lucide-react";
import { useId, useState, type ReactElement, type ReactNode } from "react";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "./popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";
import { getHelpTerm } from "../../config/helpText";
import { Button } from "./button";

type HelpTooltipProps = {
    termId?: string;
    title?: ReactNode;
    detail?: ReactNode;
    variant?: "help" | "info" | "label";
    children?: ReactNode;
    forcePopover?: boolean;
};

function ShortHelp({ trigger, children }: { trigger: ReactElement; children: ReactNode }) {
    const id = useId();
    const [handle] = useState(() => BaseTooltip.createHandle());
    return (
        <TooltipProvider>
            <Tooltip handle={handle}>
                <TooltipTrigger id={id} aria-describedby={id + "-description"} render={trigger} closeOnClick={false} onClick={() => handle.open(id)} />
                <TooltipContent id={id + "-description"}>{children}</TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

function HelpControl({ termId, title, detail, forcePopover, variant }: HelpTooltipProps) {
    const term = getHelpTerm(termId ?? "");
    const summary = title ?? term?.definition;
    const details = detail ?? term?.detail;
    if (!summary && !details) return null;
    return <HelpPopup heading={term?.title} summary={summary} details={details} variant={variant} forcePopover={forcePopover} />;
}

function HelpPopup({ heading, summary, details, variant, forcePopover }: Pick<HelpTooltipProps, "variant" | "forcePopover"> & {
    heading?: string; summary?: ReactNode; details?: ReactNode;
}) {
    const Icon = variant === "info" ? Info : CircleHelp;
    const trigger = (
        <Button variant="ghost" size="icon-xs" aria-label={heading ? `About ${heading}` : "About this term"} type="button">
            <Icon aria-hidden="true" className="size-3.5" />
        </Button>
    );
    if (!details && !forcePopover) return <ShortHelp trigger={trigger}>{summary}</ShortHelp>;
    return (
        <Popover>
            <PopoverTrigger render={trigger} />
            <PopoverContent>
                <PopoverTitle>{heading ?? "Help details"}</PopoverTitle>
                {summary && <p>{summary}</p>}
                {details && <p className="text-muted-foreground">{details}</p>}
            </PopoverContent>
        </Popover>
    );
}

export function HelpTooltip({ children, ...props }: HelpTooltipProps) {
    const control = <HelpControl {...props} />;
    if (props.variant === "label") {
        return <span className="inline-flex max-w-full items-center gap-1"><span className="min-w-0">{children}</span>{control}</span>;
    }
    return <>{children}{control}</>;
}

export function HelpFieldLabel({ termId, children }: { termId: string; children: ReactNode }) {
    return <HelpTooltip termId={termId} variant="label">{children}</HelpTooltip>;
}
