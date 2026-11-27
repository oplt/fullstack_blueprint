import * as React from "react";
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import { cn } from "@/lib/utils";
function Avatar({ className, size = "default", ...props }: AvatarPrimitive.Root.Props & { size?: "default" | "sm" | "lg" }) { return <AvatarPrimitive.Root data-slot="avatar" data-size={size} className={cn("group/avatar ui-avatar", className)} {...props} />; }
function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) { return <AvatarPrimitive.Image data-slot="avatar-image" className={cn("ui-avatar-image", className)} {...props} />; }
function AvatarFallback({ className, ...props }: AvatarPrimitive.Fallback.Props) { return <AvatarPrimitive.Fallback data-slot="avatar-fallback" className={cn("ui-avatar-fallback", className)} {...props} />; }
export function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) { return <span data-slot="avatar-badge" className={cn("ui-avatar-badge", className)} {...props} />; }
export function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="avatar-group" className={cn("group/avatar-group ui-avatar-group", className)} {...props} />; }
export function AvatarGroupCount({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="avatar-group-count" className={cn("ui-avatar-group-count", className)} {...props} />; }
export { Avatar, AvatarImage, AvatarFallback };
