import type { ReactNode } from "react";
import type { CSSProperties } from "react";
type WorkspaceSplitRatio = "8-4" | "9-3" | "3-9" | "4-8";
type WorkspaceSplitProps = { main: ReactNode; side?: ReactNode; ratio?: WorkspaceSplitRatio; sideFrom?: "md" | "lg" | "xl"; gap?: number; sx?: CSSProperties };
const tracks: Record<WorkspaceSplitRatio, string> = { "8-4": "minmax(0,2fr) minmax(280px,1fr)", "9-3": "minmax(0,3fr) minmax(240px,1fr)", "3-9": "minmax(220px,1fr) minmax(0,3fr)", "4-8": "minmax(280px,1fr) minmax(0,2fr)" };
export function WorkspaceSplit({ main, side, ratio = "8-4", gap = 16, sideFrom = "lg", sx }: WorkspaceSplitProps) {
    const [mainTrack, sideTrack] = tracks[ratio].split(" ");
    return (
        <div
            className="workspace-split"
            data-side-from={side ? sideFrom : undefined}
            style={{
                ...sx,
                "--layout-gap": `${gap}px`,
                "--workspace-main": mainTrack,
                "--workspace-side": sideTrack,
            } as CSSProperties}
        >
            <section className="min-w-0">{main}</section>
            {side ? <aside>{side}</aside> : null}
        </div>
    );
}
