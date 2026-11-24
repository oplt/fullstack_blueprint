import type { ReactElement } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";
type DisabledWithReasonProps = { reason?: string | null; children: ReactElement };
export function DisabledWithReason({ reason, children }: DisabledWithReasonProps) { if (!reason) return children; return <Tooltip><TooltipTrigger render={<span className="inline-flex self-start" />}>{children}</TooltipTrigger><TooltipContent>{reason}</TooltipContent></Tooltip>; }
