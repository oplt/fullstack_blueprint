import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
type PageWidth = "compact" | "readable" | "default" | "wide" | "full";
type PageShellProps = { children: ReactNode; width?: PageWidth; dense?: boolean; className?: string };
export function PageShell({ children, width = "default", dense = false, className }: PageShellProps) {
    const widthName = width;
    return (
        <div className={cn(dense ? "page-shell page-shell--dense" : "page-shell", className)}>
            <div className="page-shell__content" data-width={widthName}>
                {children}
            </div>
        </div>
    );
}
