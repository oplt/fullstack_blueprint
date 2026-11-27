import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
type WorkspaceSplitRatio = "8-4" | "9-3" | "3-9" | "4-8";
type WorkspaceSplitProps = { main: ReactNode; side?: ReactNode; ratio?: WorkspaceSplitRatio; sideFrom?: "md" | "lg" | "xl"; className?: string };
export function WorkspaceSplit({ main, side, ratio = "8-4", sideFrom = "lg", className }: WorkspaceSplitProps) { return <div className={cn("workspace-split", className)} data-side-from={side ? sideFrom : undefined} data-ratio={ratio}><section className="min-w-0">{main}</section>{side ? <aside>{side}</aside> : null}</div>; }
