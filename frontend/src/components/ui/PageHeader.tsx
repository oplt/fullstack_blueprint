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
        <div className="ui-page-header-actions">
            {secondaryActions}{actions}{primaryAction}
            {overflowItems.length > 0 && (
                <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" aria-label="More actions" />}>
                        <MoreVertical className="size-(--icon-size-md)" />
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
        <header className={cn("ui-page-header", className)}>
            <div className="ui-page-header-heading">
                {icon && <span className="ui-page-header-icon">{icon}</span>}
                <div className="min-w-0">
                    <h1 className={dense ? "text-display-md" : "text-page-title"}>{title}</h1>
                    {description && <p className="ui-page-header-description">{description}</p>}
                    {status && <div className="ui-page-header-status">{status}</div>}
                </div>
            </div>
            <HeaderActions {...props} />
        </header>
    );
}
