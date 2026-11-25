import type { HTMLAttributes } from "react";
type ScrollRegionProps = HTMLAttributes<HTMLDivElement>;
export function ScrollRegion({ className, ...props }: ScrollRegionProps) { return <div {...props} className={`min-w-0 overflow-x-auto ${className ?? ""}`} />; }
