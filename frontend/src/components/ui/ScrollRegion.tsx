import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
type ScrollRegionProps = HTMLAttributes<HTMLDivElement>;
export function ScrollRegion({ className, ...props }: ScrollRegionProps) { return <div {...props} className={cn("min-w-0 overflow-x-auto", className)} />; }
