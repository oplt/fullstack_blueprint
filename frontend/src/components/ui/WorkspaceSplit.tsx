import type { ReactNode } from "react";
import type { CSSProperties } from "react";
export type WorkspaceSplitRatio = "8-4" | "9-3" | "3-9" | "4-8";
type WorkspaceSplitProps = { main: ReactNode; side?: ReactNode; ratio?: WorkspaceSplitRatio; sideFrom?: "md" | "lg" | "xl"; gap?: number; sx?: CSSProperties };
const tracks: Record<WorkspaceSplitRatio, string> = { "8-4": "minmax(0,2fr) minmax(280px,1fr)", "9-3": "minmax(0,3fr) minmax(240px,1fr)", "3-9": "minmax(220px,1fr) minmax(0,3fr)", "4-8": "minmax(280px,1fr) minmax(0,2fr)" };
export function WorkspaceSplit({ main, side, ratio = "8-4", gap = 16, sx }: WorkspaceSplitProps) { return <div className="grid w-full min-w-0" style={{ ...sx, display: "grid", gap: gap * 4, gridTemplateColumns: side ? "minmax(0,1fr)" : "1fr" }}><section className="min-w-0">{main}</section>{side ? <aside className="min-w-0" data-desktop-columns={tracks[ratio]}>{side}</aside> : null}</div>; }
