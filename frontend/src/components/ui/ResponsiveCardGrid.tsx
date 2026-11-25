import type { ReactNode } from "react";
import type { CSSProperties } from "react";
export type ResponsiveCardColumns = 2 | 3 | 4;
type ResponsiveCardGridProps = { children: ReactNode; columns?: ResponsiveCardColumns; gap?: number; sx?: CSSProperties };
export function ResponsiveCardGrid({ children, columns = 3, gap = 16, sx }: ResponsiveCardGridProps) {
    return (
        <div
            className="responsive-card-grid"
            data-columns={columns}
            style={{ ...sx, "--layout-gap": `${gap}px` } as CSSProperties}
        >
            {children}
        </div>
    );
}
