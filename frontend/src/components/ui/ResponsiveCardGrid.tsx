import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
export type ResponsiveCardColumns = 2 | 3 | 4;
type ResponsiveCardGridProps = { children: ReactNode; columns?: ResponsiveCardColumns; className?: string };
export function ResponsiveCardGrid({ children, columns = 3, className }: ResponsiveCardGridProps) { return <div className={cn("responsive-card-grid", className)} data-columns={columns}>{children}</div>; }
