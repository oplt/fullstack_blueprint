import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
type SectionCardVariant = "default" | "subtle" | "outlined" | "flat";
type SectionCardProps = {
    title?: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
    children: ReactNode;
    variant?: SectionCardVariant;
    size?: "default" | "lg";
    compact?: boolean;
    titleAs?: "h2" | "h3" | "h4" | "h5" | "h6";
    className?: string;
    contentClassName?: string;
};

function getSectionCardClass(variant: SectionCardVariant, size: "default" | "lg", compact: boolean, className?: string) {
    const radius = size === "lg" && !compact ? "rounded-lg" : "rounded-md";
    const padding = variant === "flat" ? "p-0" : compact ? "p-3" : size === "lg" ? "p-8" : "p-6";
    const surface = {
        default: "surface-card",
        subtle: "border border-border bg-muted/40",
        outlined: "border border-border bg-transparent",
        flat: "bg-transparent",
    }[variant];

    return cn("flex h-full min-h-0 flex-col", radius, padding, surface, className);
}

function SectionCardHeader({ title, description, action, compact, titleAs: Title = "h2" }: Pick<SectionCardProps, "title" | "description" | "action" | "compact" | "titleAs">) {
    if (!title && !description && !action) return null;

    const density = compact
        ? { margin: "mb-3", title: "text-xs font-medium" }
        : { margin: "mb-4", title: "text-display-md font-semibold" };

    return <div className={cn("flex shrink-0 justify-between gap-4", density.margin, "flex-col sm:flex-row sm:items-start")}>
        <div className="min-w-0 flex-1">
            {title ? <Title className={density.title}>{title}</Title> : null}
            {description ? <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
    </div>;
}

function getCardSize(compact: boolean, size: "default" | "lg") {
    if (compact) return "sm";
    return size;
}

export function SectionCard({ title, description, action, children, variant = "default", size = "default", compact = false, titleAs: Title = "h2", className, contentClassName }: SectionCardProps) {
    return <section data-size={getCardSize(compact, size)} className={getSectionCardClass(variant, size, compact, className)}>
        <SectionCardHeader title={title} description={description} action={action} compact={compact} titleAs={Title} />
        <div className={cn("min-h-0 flex-1", contentClassName)}>{children}</div>
    </section>;
}
