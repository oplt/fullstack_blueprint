import type { HTMLAttributes } from "react";
import { inlineStyle, type StyleCompat } from "./styleCompat";
type ScrollRegionProps = HTMLAttributes<HTMLDivElement> & { sx?: StyleCompat };
export function ScrollRegion({ sx, style, ...props }: ScrollRegionProps) { return <div {...props} style={{ overflowX: "auto", minWidth: 0, WebkitOverflowScrolling: "touch", ...style, ...inlineStyle(sx) }} />; }
