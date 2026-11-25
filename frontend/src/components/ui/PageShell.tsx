import type { ReactNode } from "react";
import type { CSSProperties } from "react";
export type PageWidth = "compact" | "readable" | "default" | "wide" | "full";
type PageShellProps = { children: ReactNode; width?: PageWidth; maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false; dense?: boolean; sx?: CSSProperties };
export function PageShell({ children, width, maxWidth, dense = false, sx }: PageShellProps) {
    const resolved = maxWidth !== undefined ? maxWidth : width ?? "wide";
    const widthName = resolved === false ? "full" : resolved;
    return (
        <div className={dense ? "page-shell page-shell--dense" : "page-shell"} style={sx}>
            <div className="page-shell__content" data-width={widthName}>
                {children}
            </div>
        </div>
    );
}
