import type { ReactNode } from "react";
export type ResponsiveCardColumns = 2 | 3 | 4;
type ResponsiveCardGridProps = { children: ReactNode; columns?: ResponsiveCardColumns; className?: string };
export function ResponsiveCardGrid({ children, columns = 3, className }: ResponsiveCardGridProps) {
    return (
        <div
            className={`responsive-card-grid gap-4 ${className ?? ""}`}
            data-columns={columns}
        >
            {children}
        </div>
    );
}
