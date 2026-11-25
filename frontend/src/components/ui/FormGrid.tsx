import type { ReactNode } from "react";
type FormGridColumns = "1" | "2" | "3" | "4" | "6-6" | "4-4-4" | "8-4" | "4-8" | "3-9" | "9-3";
type FormGridProps = { children: ReactNode; columns?: FormGridColumns; className?: string };
export function FormGrid({ children, columns: count = "4-4-4", className }: FormGridProps) {
    return (
        <div
            className={`form-grid gap-4 ${className ?? ""}`}
            data-columns={count}
        >
            {children}
        </div>
    );
}
