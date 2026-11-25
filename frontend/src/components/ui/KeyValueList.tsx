import type { ReactNode } from "react";

import { helpTermIdForKey } from "../../config/helpText";
import { cn } from "@/lib/utils";
import { HelpTooltip } from "./HelpTooltip";

export type KeyValueItem = {
    key: string;
    label: ReactNode;
    value: ReactNode;
    description?: ReactNode;
    helpTermId?: string;
};

type KeyValueListProps = {
    items: KeyValueItem[];
    dense?: boolean;
    emptyLabel?: string;
    showHelp?: boolean;
    className?: string;
};

export function KeyValueList({
    items,
    dense = false,
    emptyLabel = "No metrics available.",
    showHelp = true,
    className,
}: KeyValueListProps) {
    if (!items.length) {
        return (
            <p className={cn("text-sm text-muted-foreground", className)}>
                {emptyLabel}
            </p>
        );
    }

    return (
        <dl
            className={cn(
                "m-0 grid grid-cols-1 gap-x-4",
                "sm:grid-cols-[minmax(120px,40%)_minmax(0,1fr)]",
                dense ? "gap-y-1.5" : "gap-y-2.5",
                className,
            )}
        >
            {items.map((item) => {
                const termId =
                    item.helpTermId ??
                    (showHelp ? helpTermIdForKey(item.key) : null);

                return (
                    <div key={item.key} className="contents">
                        <dt className="border-b border-border py-2 text-sm text-muted-foreground sm:pr-2">
                            {termId ? (
                                <HelpTooltip termId={termId} variant="label">
                                    {item.label}
                                </HelpTooltip>
                            ) : (
                                item.label
                            )}
                        </dt>

                        <dd className="m-0 min-w-0 border-b border-border py-2">
                            <div className="break-words text-sm font-medium tabular-nums">
                                {item.value}
                            </div>

                            {item.description ? (
                                <div className="text-xs text-muted-foreground">
                                    {item.description}
                                </div>
                            ) : null}
                        </dd>
                    </div>
                );
            })}
        </dl>
    );
}