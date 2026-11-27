import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
type PageWidth = "compact" | "readable" | "default" | "wide" | "full";
type PageShellProps = { children: ReactNode; width?: PageWidth; dense?: boolean; className?: string };
export function PageShell({ children, width = "default", dense = false, className }: PageShellProps) { return <div className={cn("page-shell", dense && "page-shell--dense", className)}><div className="page-shell__content" data-width={width}>{children}</div></div>; }
