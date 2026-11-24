import { memo } from "react";
import { useNotifications } from "../../hooks/useNotifications";
export function NotificationNavBadge({ children }: { children: React.ReactNode }) { const { data: notifications } = useNotifications(); const unreadCount = notifications?.filter((notification) => !notification.is_read).length ?? 0; return <span className="relative inline-flex">{children}{unreadCount > 0 ? <span aria-label={unreadCount + " unread notifications"} className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}</span>; }
export const MemoizedNotificationNavBadge = memo(NotificationNavBadge);
