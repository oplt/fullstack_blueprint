import type { ReactNode } from "react";
import { inlineStyle, type StyleCompat } from "./styleCompat";
export type FormGridColumns = "1" | "2" | "3" | "4" | "6-6" | "4-4-4" | "8-4" | "4-8" | "3-9" | "9-3";
const columns: Record<FormGridColumns, string> = { "1": "1fr", "2": "repeat(2,minmax(0,1fr))", "3": "repeat(3,minmax(0,1fr))", "4": "repeat(4,minmax(0,1fr))", "6-6": "repeat(2,minmax(0,1fr))", "4-4-4": "repeat(3,minmax(0,1fr))", "8-4": "minmax(0,2fr) minmax(0,1fr)", "4-8": "minmax(0,1fr) minmax(0,2fr)", "3-9": "minmax(0,1fr) minmax(0,3fr)", "9-3": "minmax(0,3fr) minmax(0,1fr)" };
type FormGridProps = { children: ReactNode; columns?: FormGridColumns; gap?: number; sx?: StyleCompat };
export function FormGrid({ children, columns: count = "4-4-4", gap = 16, sx }: FormGridProps) { return <div className="grid w-full items-start" style={{ ...inlineStyle(sx), display: "grid", width: "100%", gap: gap * 4, gridTemplateColumns: columns[count] }}>{children}</div>; }
