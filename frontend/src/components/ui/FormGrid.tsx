import type { ReactNode } from "react";
import type { CSSProperties } from "react";
type FormGridColumns = "1" | "2" | "3" | "4" | "6-6" | "4-4-4" | "8-4" | "4-8" | "3-9" | "9-3";
type FormGridProps = { children: ReactNode; columns?: FormGridColumns; gap?: number; sx?: CSSProperties };
export function FormGrid({ children, columns: count = "4-4-4", gap = 16, sx }: FormGridProps) {
    return (
        <div
            className="form-grid"
            data-columns={count}
            style={{ ...sx, "--layout-gap": `${gap}px` } as CSSProperties}
        >
            {children}
        </div>
    );
}
