import type { ReactNode } from "react";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type PageHeaderOverflowItem = { id: string; label: ReactNode; onClick: () => void; disabled?: boolean };
type PageHeaderProps = {
    title: ReactNode;
    description?: ReactNode;
    status?: ReactNode;
    primaryAction?: ReactNode;
    secondaryActions?: ReactNode;
    overflowItems?: PageHeaderOverflowItem[];
    actions?: ReactNode;
    icon?: ReactNode;
    dense?: boolean;
    className?: string;
};

function HeaderActions({ primaryAction, secondaryActions, actions, overflowItems = [] }: PageHeaderProps) {
    if (!primaryAction && !secondaryActions && !actions && !overflowItems.length) return null;
    return (
        <div className="flex shrink-0 flex-wrap items-center justify-start gap-2 sm:justify-end">
            {secondaryActions}{actions}{primaryAction}
            {overflowItems.length > 0 && (
                <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" aria-label="More actions" />}>
                        <MoreVertical className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {overflowItems.map((item) => (
                            <DropdownMenuItem
                                nativeButton
                                render={<button type="button" />}
                                key={item.id}
                                onClick={item.onClick}
                                disabled={item.disabled}
                                className="w-full"
                            >
                                {item.label}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    );
}

export function PageHeader(props: PageHeaderProps) {
    const { title, description, status, icon, dense, className } = props;
    return (
        <header className={cn("mb-6 flex min-w-0 flex-col justify-between gap-4 sm:flex-row sm:items-start", className)}>
            <div className="flex min-w-0 items-start gap-3">
                {icon && <span className="mt-1 flex shrink-0 text-primary">{icon}</span>}
                <div className="min-w-0">
                    <h1 className={cn("font-semibold", dense ? "text-display-md" : "text-page-title")}>{title}</h1>
                    {description && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>}
                    {status && <div className="mt-2">{status}</div>}
                </div>
            </div>
            <HeaderActions {...props} />
        </header>
    );
}
