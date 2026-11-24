import type { ReactNode } from "react";
import type { CSSProperties } from "react";
export type PageWidth = "compact" | "readable" | "default" | "wide" | "full";
type PageShellProps = { children: ReactNode; width?: PageWidth; maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false; dense?: boolean; sx?: CSSProperties };
const widths: Record<string, string> = { xs: "444px", sm: "600px", md: "900px", lg: "1200px", xl: "1440px", compact: "600px", readable: "900px", default: "1200px", wide: "1440px", full: "none" };
export function PageShell({ children, width, maxWidth, dense = false, sx }: PageShellProps) { const resolved = maxWidth !== undefined ? maxWidth : width ?? "wide"; return <div className={dense ? "relative w-full px-3 py-3 sm:px-4" : "relative w-full px-4 py-5 sm:px-6 sm:py-6"} style={sx}><div className="mx-auto flex w-full flex-col gap-4" style={{ maxWidth: resolved === false ? "none" : widths[resolved] }}>{children}</div></div>; }
