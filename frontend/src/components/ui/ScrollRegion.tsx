import type { HTMLAttributes } from "react";
import type { CSSProperties } from "react";
type ScrollRegionProps = HTMLAttributes<HTMLDivElement> & { sx?: CSSProperties };
export function ScrollRegion({ sx, style, ...props }: ScrollRegionProps) { return <div {...props} style={{ overflowX: "auto", minWidth: 0, WebkitOverflowScrolling: "touch", ...style, ...sx }} />; }
