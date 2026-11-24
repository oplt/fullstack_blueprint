import type { ReactNode } from "react";
import type { CSSProperties } from "react";
import { denseCardColumns } from "./responsiveQa";
export type ResponsiveCardColumns = 2 | 3 | 4;
type ResponsiveCardGridProps = { children: ReactNode; columns?: ResponsiveCardColumns; gap?: number; sx?: CSSProperties };
export function ResponsiveCardGrid({ children, columns = 3, gap = 16, sx }: ResponsiveCardGridProps) { return <div className="grid w-full items-stretch" style={{ ...sx, display: "grid", gap: gap * 4, gridTemplateColumns: "repeat(1,minmax(0,1fr))" }} data-columns={JSON.stringify(denseCardColumns(columns))}>{children}</div>; }
