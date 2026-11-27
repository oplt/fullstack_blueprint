import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";

type SectionCardProps = {
    title?: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
    children: ReactNode;
    variant?: "default" | "subtle" | "outlined" | "flat";
    size?: "default" | "lg";
    compact?: boolean;
    titleAs?: "h2" | "h3" | "h4" | "h5" | "h6";
    className?: string;
    contentClassName?: string;
};

type HeaderProps = Pick<SectionCardProps, "title" | "description" | "action" | "titleAs">;
function SectionCardHeader({ title, description, action, titleAs = "h2" }: HeaderProps) {
    if (!title && !description && !action) return null;
    return <CardHeader className="ui-section-card-header">
        {(title || description) && <div className="min-w-0 flex-1">
            {title && <CardTitle as={titleAs}>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
        </div>}
        {action && <div className="shrink-0">{action}</div>}
    </CardHeader>;
}
export function SectionCard({ title, description, action, children, variant = "default", size = "default", compact = false, titleAs, className, contentClassName }: SectionCardProps) {
    return <Card as="section" size={compact ? "sm" : size} variant={variant} className={cn("ui-section-card", className)}>
        <SectionCardHeader title={title} description={description} action={action} titleAs={titleAs} />
        <CardContent className={cn("ui-section-card-content", contentClassName)}>{children}</CardContent>
    </Card>;
}
